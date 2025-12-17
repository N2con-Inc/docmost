import React, { useState, useRef, useEffect } from 'react';
import { useAIContext } from '../context/ai-provider';
import { useAI } from '../hooks/use-ai';
import { useAILiveEdit } from '../hooks/use-ai-live-edit';
import { getInsertableContent, extractInsertableContent } from '../utils/content-extractor';
import { ActionIcon, Badge, Box, Button, Group, ScrollArea, Stack, Text, Textarea, Title, Loader, Tooltip } from '@mantine/core';
import { IconX, IconSend, IconRobot, IconCopy, IconArrowBigDownLine, IconReplace, IconSparkles } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { extractPageSlugId } from '@/lib';
import { usePageQuery } from '@/features/page/queries/page-query';
import { useAtom } from 'jotai';
import { pageEditorAtom } from '@/features/editor/atoms/editor-atoms';

export function AIChatSidebar() {
    const { isChatOpen, toggleChat } = useAIContext();
    const { messages, sendMessage, isLoading } = useAI();
    const [input, setInput] = useState('');
    const scrollViewport = useRef<HTMLDivElement>(null);
    const { pageSlug } = useParams();
    const pageId = extractPageSlugId(pageSlug);
    const { data: page } = usePageQuery({ pageId });
    const [pageEditor] = useAtom(pageEditorAtom);
    const { insertAtCursor, replaceSelection, copyToClipboard } = useAILiveEdit({ editor: pageEditor });

    useEffect(() => {
        if (scrollViewport.current) {
            scrollViewport.current.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

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
            pageId,
            selectedText
        });
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInsertAtCursor = (content: string) => {
        const extracted = getInsertableContent(content);
        insertAtCursor(extracted);
    };

    const handleReplaceSelection = (content: string) => {
        const extracted = getInsertableContent(content);
        replaceSelection(extracted);
    };

    const handleCopy = (content: string) => {
        const extracted = getInsertableContent(content);
        copyToClipboard(extracted);
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
                <ActionIcon variant="subtle" onClick={toggleChat}>
                    <IconX size={20} />
                </ActionIcon>
            </Group>

            {page && (
                <Box p="xs" px="md" style={{ backgroundColor: 'var(--mantine-color-gray-light)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                    <Text size="xs" c="dimmed">
                        Discussing: <Text span fw={500} c="dark">{page.title}</Text>
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
                                                onClick={() => handleInsertAtCursor(msg.content)}
                                            >
                                                <IconArrowBigDownLine size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        
                                        <Tooltip label="Replace selection">
                                            <ActionIcon 
                                                size="sm" 
                                                variant="light" 
                                                color="grape"
                                                onClick={() => handleReplaceSelection(msg.content)}
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
