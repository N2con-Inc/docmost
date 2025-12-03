import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api-client';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export function useAI() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const chatMutation = useMutation({
        mutationFn: async (msgs: ChatMessage[]) => {
            const response = await api.post('/ai/chat', { messages: msgs });
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

    const sendMessage = async (content: string) => {
        const newMessages: ChatMessage[] = [...messages, { role: 'user', content }];
        setMessages(newMessages);
        setIsLoading(true);
        chatMutation.mutate(newMessages);
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
