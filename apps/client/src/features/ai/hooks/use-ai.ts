import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api-client';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface SendMessageOptions {
    pageId?: string;
    selectedText?: string;
    includeRelatedDocs?: boolean;
    includeWikiStructure?: boolean;
    includeAttachments?: boolean;
}

export function useAI() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const chatMutation = useMutation({
        mutationFn: async ({ msgs, pageId, selectedText, includeRelatedDocs, includeWikiStructure, includeAttachments }: { 
            msgs: ChatMessage[], 
            pageId?: string,
            selectedText?: string,
            includeRelatedDocs?: boolean,
            includeWikiStructure?: boolean,
            includeAttachments?: boolean
        }) => {
            const response = await api.post('/ai/chat', { 
                messages: msgs,
                pageId,
                selectedText,
                includeRelatedDocs,
                includeWikiStructure,
                includeAttachments
            });
            return response.data;
        },
        onSuccess: (data) => {
            setMessages((prev) => [...prev, { role: 'assistant', content: data }]);
            setIsLoading(false);
        },
        onError: () => {
            setIsLoading(false);
        },
    });

    const sendMessage = async (content: string, options?: SendMessageOptions) => {
        const newMessages: ChatMessage[] = [...messages, { role: 'user', content }];
        setMessages(newMessages);
        setIsLoading(true);
        chatMutation.mutate({ 
            msgs: newMessages,
            pageId: options?.pageId,
            selectedText: options?.selectedText,
            includeRelatedDocs: options?.includeRelatedDocs,
            includeWikiStructure: options?.includeWikiStructure,
            includeAttachments: options?.includeAttachments
        });
    };

    const clearChat = () => {
        setMessages([]);
    };

    return {
        messages,
        sendMessage,
        isLoading,
        clearChat,
    };
}
