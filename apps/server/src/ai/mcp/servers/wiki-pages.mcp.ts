import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { z } from 'zod';
import { PageService } from '../../../core/page/services/page.service';
import { PageRepo } from '../../../database/repos/page/page.repo';
import { AttachmentRepo } from '../../../database/repos/attachment/attachment.repo';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';

@Injectable()
export class WikiPagesMCP {
    constructor(
        @Inject(forwardRef(() => PageService))
        private readonly pageService: PageService,
        private readonly pageRepo: PageRepo,
        private readonly attachmentRepo: AttachmentRepo,
        @InjectKysely() private readonly db: KyselyDB,
    ) {}

    getTools() {
        return [
            {
                name: 'get_page_full_content',
                description: 'Fetch the complete content of a wiki page by its ID or title. Use this when you need to read or analyze the full text of a page.',
                inputSchema: z.object({
                    pageId: z.string().optional().describe('The ID of the page to fetch'),
                    pageTitle: z.string().optional().describe('The title of the page to fetch (if pageId not provided)'),
                    workspaceId: z.string().describe('The workspace ID'),
                }),
                func: async ({ pageId, pageTitle, workspaceId }: { pageId?: string, pageTitle?: string, workspaceId: string }) => {
                    try {
                        let page;
                        
                        if (pageId) {
                            page = await this.pageService.findById(pageId, true, false, false);
                        } else if (pageTitle) {
                            // Search by title
                            const result = await this.db
                                .selectFrom('pages')
                                .selectAll()
                                .where('title', 'ilike', `%${pageTitle}%`)
                                .where('workspaceId', '=', workspaceId)
                                .where('deletedAt', 'is', null)
                                .limit(1)
                                .executeTakeFirst();
                            
                            if (result) {
                                page = await this.pageService.findById(result.id, true, false, false);
                            }
                        }

                        if (!page) {
                            return {
                                content: [{ type: 'text', text: 'Page not found' }]
                            };
                        }

                        // Convert content to plain text
                        const contentText = page.textContent || JSON.stringify(page.content);

                        return {
                            content: [{
                                type: 'text',
                                text: `# ${page.title}\n\n${contentText}`
                            }]
                        };
                    } catch (error) {
                        return {
                            content: [{ type: 'text', text: `Error fetching page: ${(error as Error).message}` }]
                        };
                    }
                }
            },
            {
                name: 'list_child_pages',
                description: 'List all child pages of a given page. Returns titles and IDs of direct children.',
                inputSchema: z.object({
                    pageId: z.string().describe('The ID of the parent page'),
                }),
                func: async ({ pageId }: { pageId: string }) => {
                    try {
                        const children = await this.db
                            .selectFrom('pages')
                            .select(['id', 'title', 'textContent'])
                            .where('parentPageId', '=', pageId)
                            .where('deletedAt', 'is', null)
                            .execute();

                        const childList = children.map(child => 
                            `- **${child.title}** (ID: ${child.id})\n  ${child.textContent?.substring(0, 200) || 'No content'}...`
                        ).join('\n');

                        return {
                            content: [{
                                type: 'text',
                                text: `Found ${children.length} child pages:\n\n${childList || 'No child pages found'}`
                            }]
                        };
                    } catch (error) {
                        return {
                            content: [{ type: 'text', text: `Error listing children: ${(error as Error).message}` }]
                        };
                    }
                }
            },
            {
                name: 'list_sibling_pages',
                description: 'List sibling pages (pages that share the same parent) of a given page.',
                inputSchema: z.object({
                    pageId: z.string().describe('The ID of the page'),
                }),
                func: async ({ pageId }: { pageId: string }) => {
                    try {
                        const page = await this.pageRepo.findById(pageId, {});
                        if (!page?.parentPageId) {
                            return {
                                content: [{ type: 'text', text: 'This page has no siblings (no parent page)' }]
                            };
                        }

                        const siblings = await this.db
                            .selectFrom('pages')
                            .select(['id', 'title'])
                            .where('parentPageId', '=', page.parentPageId)
                            .where('id', '!=', pageId)
                            .where('deletedAt', 'is', null)
                            .execute();

                        const siblingList = siblings.map(sib => `- **${sib.title}** (ID: ${sib.id})`).join('\n');

                        return {
                            content: [{
                                type: 'text',
                                text: `Found ${siblings.length} sibling pages:\n\n${siblingList || 'No sibling pages found'}`
                            }]
                        };
                    } catch (error) {
                        return {
                            content: [{ type: 'text', text: `Error listing siblings: ${(error as Error).message}` }]
                        };
                    }
                }
            },
            {
                name: 'get_page_attachments',
                description: 'List all attachments on a page with their details and extracted text content if available.',
                inputSchema: z.object({
                    pageId: z.string().describe('The ID of the page'),
                }),
                func: async ({ pageId }: { pageId: string }) => {
                    try {
                        const attachments = await this.db
                            .selectFrom('attachments')
                            .select(['id', 'fileName', 'fileExt', 'mimeType', 'fileSize', 'textContent'])
                            .where('pageId', '=', pageId)
                            .where('deletedAt', 'is', null)
                            .execute();

                        if (attachments.length === 0) {
                            return {
                                content: [{ type: 'text', text: 'No attachments found on this page' }]
                            };
                        }

                        const attachmentList = attachments.map(att => {
                            const name = `${att.fileName}${att.fileExt ? '.' + att.fileExt : ''}`;
                            const size = att.fileSize ? `${Math.round(Number(att.fileSize) / 1024)}KB` : 'unknown size';
                            let info = `- **${name}** (${att.mimeType}, ${size})`;
                            
                            if (att.textContent && att.textContent.length > 0) {
                                info += `\n  Content excerpt: ${att.textContent.substring(0, 500)}...`;
                            }
                            
                            return info;
                        }).join('\n\n');

                        return {
                            content: [{
                                type: 'text',
                                text: `Found ${attachments.length} attachments:\n\n${attachmentList}`
                            }]
                        };
                    } catch (error) {
                        return {
                            content: [{ type: 'text', text: `Error fetching attachments: ${(error as Error).message}` }]
                        };
                    }
                }
            },
            {
                name: 'search_pages',
                description: 'Search for pages by title or content. Returns matching page titles and IDs.',
                inputSchema: z.object({
                    query: z.string().describe('Search query (matches against page title and content)'),
                    workspaceId: z.string().describe('The workspace ID to search within'),
                    limit: z.number().optional().default(10).describe('Maximum number of results (default 10)'),
                }),
                func: async ({ query, workspaceId, limit = 10 }: { query: string, workspaceId: string, limit?: number }) => {
                    try {
                        const results = await this.db
                            .selectFrom('pages')
                            .select(['id', 'title', 'textContent'])
                            .where('workspaceId', '=', workspaceId)
                            .where('deletedAt', 'is', null)
                            .where((eb) => eb.or([
                                eb('title', 'ilike', `%${query}%`),
                                eb('textContent', 'ilike', `%${query}%`),
                            ]))
                            .limit(limit)
                            .execute();

                        if (results.length === 0) {
                            return {
                                content: [{ type: 'text', text: `No pages found matching "${query}"` }]
                            };
                        }

                        const resultList = results.map(page => 
                            `- **${page.title}** (ID: ${page.id})\n  ${page.textContent?.substring(0, 150) || 'No content'}...`
                        ).join('\n\n');

                        return {
                            content: [{
                                type: 'text',
                                text: `Found ${results.length} pages matching "${query}":\n\n${resultList}`
                            }]
                        };
                    } catch (error) {
                        return {
                            content: [{ type: 'text', text: `Error searching: ${(error as Error).message}` }]
                        };
                    }
                }
            }
        ];
    }
}
