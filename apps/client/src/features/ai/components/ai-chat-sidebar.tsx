import React, { useState, useRef, useEffect } from 'react';
import { useAIContext } from '../context/ai-provider';
import { useAI } from '../hooks/use-ai';
import { getInsertableContent, extractInsertableContent } from '../utils/content-extractor';
import { ActionIcon, Badge, Box, Button, Group, ScrollArea, Stack, Text, Textarea, Title, Loader, Tooltip } from '@mantine/core';
import { IconX, IconSend, IconRobot, IconCopy, IconArrowBigDownLine, IconReplace, IconSparkles, IconTrash } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { extractPageSlugId } from '@/lib';
import { usePageQuery } from '@/features/page/queries/page-query';
import { useAtom } from 'jotai';
import { pageEditorAtom } from '@/features/editor/atoms/editor-atoms';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

export function AIChatSidebar() {
    const { isChatOpen, toggleChat } = useAIContext();
    const { messages, sendMessage, isLoading, clearChat } = useAI();
    const [input, setInput] = useState('');
    const [includeRelatedDocs, setIncludeRelatedDocs] = useState(false);
    const [includeWikiStructure, setIncludeWikiStructure] = useState(false);
    const [includeAttachments, setIncludeAttachments] = useState(false);
    const scrollViewport = useRef<HTMLDivElement>(null);
    const { pageSlug } = useParams();
    const pageId = extractPageSlugId(pageSlug);
    const { data: page } = usePageQuery({ pageId });
    const [pageEditor] = useAtom(pageEditorAtom);
    const [currentPageId, setCurrentPageId] = useState<string | undefined>(pageId);

    useEffect(() => {
        if (scrollViewport.current) {
            scrollViewport.current.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    // Update current page context when navigating (but don't clear chat)
    useEffect(() => {
        if (pageId !== currentPageId) {
            setCurrentPageId(pageId);
        }
    }, [pageId]);

    if (!isChatOpen) return null;

    const handleSubmit = () => {
        if (!input.trim()) return;
        
        // Get selected text from editor if available
        let selectedText: string | undefined;
        if (pageEditor?.state?.selection) {
            const { from, to } = pageEditor.state.selection;
            if (from !== to) {
                selectedText = pageEditor.state.doc.textBetween(from, to);
            }
        }

        sendMessage(input, { 
            pageId: currentPageId,
            selectedText,
            includeRelatedDocs,
            includeWikiStructure,
            includeAttachments
        });
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleLiveEdit = async (content: string, mode: 'insert' | 'replace' | 'append') => {
        try {
            const extracted = getInsertableContent(content);
            
            let position: { from: number; to: number } | undefined;
            if (pageEditor?.state?.selection) {
                const { from, to } = pageEditor.state.selection;
                position = { from, to };
            }

            const response = await axios.post('/api/ai/chat/live-edit', {
                pageId: currentPageId,
                content: extracted,
                mode,
                position,
            });

            if (response.data.success) {
                notifications.show({
                    title: 'Success',
                    message: 'AI is applying changes...',
                    color: 'blue',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to apply AI edit',
                color: 'red',
            });
        }
    };

    const handleCopy = (content: string) => {
        try {
            const extracted = getInsertableContent(content);
            navigator.clipboard.writeText(extracted);
            notifications.show({
                title: 'Success',
                message: 'Copied to clipboard',
                color: 'green',
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to copy to clipboard',
                color: 'red',
            });
        }
    };

    const handleNewChat = () => {
        clearChat();
        notifications.show({
            title: 'Chat Cleared',
            message: 'Started a new conversation',
            color: 'blue',
            autoClose: 2000,
        });
    };

    return (
        <Box
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: 380,
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
                <Group gap="xs">
                    <Tooltip label="New Chat">
                        <ActionIcon 
                            variant="subtle" 
                            onClick={handleNewChat}
                            disabled={messages.length === 0}
                        >
                            <IconTrash size={18} />
                        </ActionIcon>
                    </Tooltip>
                    <ActionIcon variant="subtle" onClick={toggleChat}>
                        <IconX size={20} />
                    </ActionIcon>
                </Group>
            </Group>

            {page && (
                <Box p="xs" px="md" style={{ backgroundColor: 'var(--mantine-color-gray-light)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                    <Text size="xs" c="dimmed">
                        Current page: <Text span fw={500} >{page.title}</Text>
                    </Text>
                </Box>
            )}

            <ScrollArea style={{ flex: 1 }} viewportRef={scrollViewport} p="md">
                <Stack gap="md">
                    {messages.length === 0 && (
                        <Text c="dimmed" size="sm" ta="center" mt="xl">
                            Ask me anything about your documents!
                        </Text>
                    )}
                    {messages.map((msg, index) => {
                        const extraction = msg.role === 'assistant' ? extractInsertableContent(msg.content) : null;
                        
                        return (
                            <Box key={index}>
                                <Box
                                    style={{
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '100%',
                                        backgroundColor: msg.role === 'user' ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-gray-light)',
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                                </Box>
                                
                                {/* Action buttons for assistant messages */}
                                {msg.role === 'assistant' && (
                                    <Group gap="xs" mt="xs" ml="xs" align="center">
                                        <Tooltip label="Insert at cursor">
                                            <ActionIcon 
                                                size="sm" 
                                                variant="light" 
                                                color="blue"
                                                onClick={() => handleLiveEdit(msg.content, 'insert')}
                                            >
                                                <IconArrowBigDownLine size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        
                                        <Tooltip label="Replace selection">
                                            <ActionIcon 
                                                size="sm" 
                                                variant="light" 
                                                color="grape"
                                                onClick={() => handleLiveEdit(msg.content, 'replace')}
                                            >
                                                <IconReplace size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        
                                        <Tooltip label="Copy to clipboard">
                                            <ActionIcon 
                                                size="sm" 
                                                variant="light" 
                                                color="gray"
                                                onClick={() => handleCopy(msg.content)}
                                            >
                                                <IconCopy size={14} />
                                            </ActionIcon>
                                        </Tooltip>

                                        {extraction?.hasExtraction && (
                                            <Tooltip label="Smart extraction active - inserting content only">
                                                <Badge 
                                                    size="xs" 
                                                    variant="light" 
                                                    color="green"
                                                    leftSection={<IconSparkles size={10} />}
                                                >
                                                    Smart
                                                </Badge>
                                            </Tooltip>
                                        )}
                                    </Group>
                                )}
                            </Box>
                        );
                    })}
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
