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
}

export function useAI() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const chatMutation = useMutation({
        mutationFn: async ({ msgs, pageId, selectedText }: { 
            msgs: ChatMessage[], 
            pageId?: string,
            selectedText?: string 
        }) => {
            const response = await api.post('/ai/chat', { 
                messages: msgs,
                pageId,
                selectedText
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
            selectedText: options?.selectedText
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
