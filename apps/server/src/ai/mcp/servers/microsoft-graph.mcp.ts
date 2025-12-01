import { Injectable } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class MicrosoftGraphMCP {
    getTools() {
        return [
            {
                name: 'get_calendar_events',
                description: 'Get upcoming calendar events from Microsoft 365 (Mocked).',
                inputSchema: z.object({
                    limit: z.number().optional().describe('Number of events to retrieve'),
                }),
                func: async ({ limit = 5 }: { limit?: number }) => {
                    // Mock data
                    const events = [
                        { subject: 'Team Sync', start: '2023-10-27T10:00:00', end: '2023-10-27T11:00:00' },
                        { subject: 'Project Review', start: '2023-10-27T14:00:00', end: '2023-10-27T15:00:00' },
                    ];
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(events.slice(0, limit), null, 2)
                            }
                        ]
                    };
                }
            },
            {
                name: 'get_emails',
                description: 'Get recent emails from Microsoft 365 (Mocked).',
                inputSchema: z.object({
                    limit: z.number().optional().describe('Number of emails to retrieve'),
                }),
                func: async ({ limit = 5 }: { limit?: number }) => {
                    // Mock data
                    const emails = [
                        { subject: 'Welcome to DocMost', from: 'admin@docmost.com', received: '2023-10-26T09:00:00' },
                        { subject: 'Weekly Update', from: 'manager@company.com', received: '2023-10-26T10:00:00' },
                    ];
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(emails.slice(0, limit), null, 2)
                            }
                        ]
                    };
                }
            }
        ];
    }
}
