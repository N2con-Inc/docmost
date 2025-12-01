import { Injectable } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class StyleGuideMCP {
    getTools() {
        return [
            {
                name: 'get_style_guide',
                description: 'Get the official DocMost style guide and formatting rules.',
                inputSchema: z.object({}),
                func: async () => {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `
# DocMost Style Guide

## General Formatting
- Use Markdown for all content.
- Use headers (H1, H2, H3) to structure content. H1 is reserved for the page title.
- Use bullet points for lists.
- Use code blocks for code snippets.

## Components
- **Callouts**: Use blockquotes for callouts.
  > **Note**: This is a note.
  > **Warning**: This is a warning.

- **Tables**: Use standard Markdown tables.

## Tone
- Professional, clear, and concise.
- Avoid jargon where possible.
                                `
                            }
                        ]
                    };
                }
            },
            {
                name: 'get_page_template',
                description: 'Get a template for a specific page type.',
                inputSchema: z.object({
                    type: z.enum(['standard', 'api_doc', 'meeting_notes']).describe('The type of page template to retrieve'),
                }),
                func: async ({ type }: { type: string }) => {
                    const templates = {
                        standard: `
# [Page Title]

## Overview
Brief description of the page content.

## Details
Detailed information.

## Related Links
- [Link 1](#)
                        `,
                        api_doc: `
# [API Name]

## Endpoint
\`GET /api/v1/resource\`

## Parameters
| Name | Type | Description |
|------|------|-------------|
| id   | string | Resource ID |

## Response
\`\`\`json
{
  "id": "123",
  "name": "Resource"
}
\`\`\`
                        `,
                        meeting_notes: `
# Meeting: [Date]

## Attendees
- [Name]

## Agenda
1. Item 1
2. Item 2

## Action Items
- [ ] [Task] (@[Person])
                        `
                    };
                    return {
                        content: [
                            {
                                type: 'text',
                                text: templates[type] || templates.standard
                            }
                        ]
                    };
                }
            }
        ];
    }
}
