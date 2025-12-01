import React, { useState, useRef, useEffect } from 'react';
import { useAIContext } from '../context/ai-provider';
import { useAI } from '../hooks/use-ai';
import { ActionIcon, Box, Button, Group, ScrollArea, Stack, Text, Textarea, Title, Loader } from '@mantine/core';
import { IconX, IconSend, IconRobot } from '@tabler/icons-react';

export function AIChatSidebar() {
    const { isChatOpen, toggleChat } = useAIContext();
    const { messages, sendMessage, isLoading } = useAI();
    const [input, setInput] = useState('');
    const scrollViewport = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollViewport.current) {
            scrollViewport.current.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    if (!isChatOpen) return null;

    const handleSubmit = () => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Box
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: 350,
                height: '100vh',
                backgroundColor: 'var(--mantine-color-body)',
                borderLeft: '1px solid var(--mantine-color-default-border)',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
            }}
        >
            <Group p="md" justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <Group gap="xs">
                    <IconRobot size={20} />
                    <Title order={5}>AI Assistant</Title>
                </Group>
                <ActionIcon variant="subtle" onClick={toggleChat}>
                    <IconX size={20} />
                </ActionIcon>
            </Group>

            <ScrollArea style={{ flex: 1 }} viewportRef={scrollViewport} p="md">
                <Stack gap="md">
                    {messages.length === 0 && (
                        <Text c="dimmed" size="sm" ta="center" mt="xl">
                            Ask me anything about your documents!
                        </Text>
                    )}
                    {messages.map((msg, index) => (
                        <Box
                            key={index}
                            style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                backgroundColor: msg.role === 'user' ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-gray-light)',
                                padding: '8px 12px',
                                borderRadius: 8,
                            }}
                        >
                            <Text size="sm">{msg.content}</Text>
                        </Box>
                    ))}
                    {isLoading && (
                        <Box
                            style={{
                                alignSelf: 'flex-start',
                                maxWidth: '85%',
                                backgroundColor: 'var(--mantine-color-gray-light)',
                                padding: '8px 12px',
                                borderRadius: 8,
                            }}
                        >
                            <Loader size="xs" type="dots" />
                        </Box>
                    )}
                </Stack>
            </ScrollArea>

            <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                <Group align="flex-end">
                    <Textarea
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.currentTarget.value)}
                        onKeyDown={handleKeyDown}
                        autosize
                        minRows={1}
                        maxRows={4}
                        style={{ flex: 1 }}
                    />
                    <ActionIcon
                        variant="filled"
                        color="blue"
                        size="lg"
                        onClick={handleSubmit}
                        loading={isLoading}
                        disabled={!input.trim()}
                    >
                        <IconSend size={18} />
                    </ActionIcon>
                </Group>
            </Box>
        </Box>
    );
}
