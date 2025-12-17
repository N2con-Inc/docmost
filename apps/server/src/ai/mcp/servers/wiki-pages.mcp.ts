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
,
            {
                name: 'get_page_tree',
                description: 'Get the complete page hierarchy tree starting from a page. Returns all descendants in a structured format. Use this to understand multi-level child organization.',
                inputSchema: z.object({
                    pageId: z.string().describe('The ID of the root page'),
                    maxDepth: z.number().optional().default(3).describe('Maximum depth (default 3, max 5)'),
                }),
                func: async ({ pageId, maxDepth = 3 }: { pageId: string, maxDepth?: number }) => {
                    try {
                        const depth = Math.min(maxDepth, 5);
                        const buildTree = async (parentId: string, currentDepth: number): Promise<any[]> => {
                            if (currentDepth > depth) return [];
                            const children = await this.db.selectFrom('pages').select(['id', 'title', 'textContent'])
                                .where('parentPageId', '=', parentId).where('deletedAt', 'is', null).orderBy('title', 'asc').execute();
                            const tree = [];
                            for (const child of children) {
                                const descendants = await buildTree(child.id, currentDepth + 1);
                                tree.push({ id: child.id, title: child.title, excerpt: child.textContent?.substring(0, 150) || '', children: descendants });
                            }
                            return tree;
                        };
                        const tree = await buildTree(pageId, 0);
                        if (tree.length === 0) return { content: [{ type: 'text', text: 'This page has no child pages.' }] };
                        const formatTree = (nodes: any[], indent = 0): string => {
                            let result = '';
                            for (const node of nodes) {
                                result += `${'  '.repeat(indent)}- **${node.title}** (ID: ${node.id})\n${'  '.repeat(indent + 1)}${node.excerpt}...\n`;
                                if (node.children.length > 0) result += formatTree(node.children, indent + 1);
                            }
                            return result;
                        };
                        return { content: [{ type: 'text', text: `Page tree (depth ${depth}):\n\n${formatTree(tree)}` }] };
                    } catch (error) {
                        return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }] };
                    }
                }
            },
            {
                name: 'get_parent_page',
                description: 'Get the parent page of the current page. Use this to navigate UP the hierarchy.',
                inputSchema: z.object({ pageId: z.string().describe('The ID of the current page') }),
                func: async ({ pageId }: { pageId: string }) => {
                    try {
                        const page = await this.pageRepo.findById(pageId, {});
                        if (!page?.parentPageId) return { content: [{ type: 'text', text: 'No parent (root page).' }] };
                        const parentPage = await this.pageRepo.findById(page.parentPageId, { includeTextContent: true });
                        if (!parentPage) return { content: [{ type: 'text', text: 'Parent not found.' }] };
                        const excerpt = parentPage.textContent?.substring(0, 300) || 'No content';
                        return { content: [{ type: 'text', text: `Parent: **${parentPage.title}** (ID: ${parentPage.id})\n\n${excerpt}...` }] };
                    } catch (error) {
                        return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }] };
                    }
                }
            },
            {
                name: 'get_page_breadcrumb',
                description: 'Get full ancestor path from root to current page. Shows complete hierarchy chain UPWARD. Use to understand where a page fits.',
                inputSchema: z.object({ pageId: z.string().describe('The ID of the current page') }),
                func: async ({ pageId }: { pageId: string }) => {
                    try {
                        const ancestors = [];
                        let currentId = pageId;
                        let depth = 0;
                        while (currentId && depth < 10) {
                            const page = await this.pageRepo.findById(currentId, { includeTextContent: true });
                            if (!page) break;
                            ancestors.unshift({ id: page.id, title: page.title, excerpt: page.textContent?.substring(0, 100) || '' });
                            currentId = page.parentPageId;
                            depth++;
                        }
                        if (ancestors.length === 0) return { content: [{ type: 'text', text: 'Could not build breadcrumb.' }] };
                        const breadcrumb = ancestors.map((a, i) => `${'  '.repeat(i)}${i > 0 ? '↳ ' : ''}**${a.title}** (ID: ${a.id})\n${'  '.repeat(i + 1)}${a.excerpt}...`).join('\n');
                        return { content: [{ type: 'text', text: `Breadcrumb (${ancestors.length} levels):\n\n${breadcrumb}` }] };
                    } catch (error) {
                        return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }] };
                    }
                }
            },
            {
                name: 'get_page_context',
                description: 'Get complete context: parent, siblings, children, and content summary. One-shot overview of page position.',
                inputSchema: z.object({ pageId: z.string().describe('The ID of the page') }),
                func: async ({ pageId }: { pageId: string }) => {
                    try {
                        const page = await this.pageRepo.findById(pageId, { includeTextContent: true });
                        if (!page) return { content: [{ type: 'text', text: 'Page not found.' }] };
                        let context = `# ${page.title}\n\n`;
                        if (page.parentPageId) {
                            const parent = await this.pageRepo.findById(page.parentPageId, {});
                            if (parent) context += `**Parent:** ${parent.title} (ID: ${parent.id})\n`;
                        } else {
                            context += `**Parent:** None (root page)\n`;
                        }
                        if (page.parentPageId) {
                            const siblings = await this.db.selectFrom('pages').select(['id', 'title'])
                                .where('parentPageId', '=', page.parentPageId).where('id', '!=', pageId).where('deletedAt', 'is', null).execute();
                            if (siblings.length > 0) context += `**Siblings:** ${siblings.length} (${siblings.map(s => s.title).join(', ')})\n`;
                        }
                        const children = await this.db.selectFrom('pages').select(['id', 'title'])
                            .where('parentPageId', '=', pageId).where('deletedAt', 'is', null).execute();
                        context += children.length > 0 ? `**Children:** ${children.length} (${children.map(c => c.title).join(', ')})\n` : `**Children:** None\n`;
                        const excerpt = page.textContent?.substring(0, 500) || 'No content';
                        context += `\n**Content:**\n${excerpt}...`;
                        return { content: [{ type: 'text', text: context }] };
                    } catch (error) {
                        return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }] };
                    }
                }
            }
        ];
    }
}
