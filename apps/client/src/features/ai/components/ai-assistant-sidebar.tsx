import React, { useState } from 'react';
import { Drawer, Stack, Textarea, Button, Text, Group, Badge, Box, Paper, ScrollArea, Divider } from '@mantine/core';
import { IconCheck, IconX, IconRefresh } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '@/lib/api-client';
import { Editor } from '@tiptap/react';
import { diffWords, Change } from 'diff';

interface AIAssistantSidebarProps {
    opened: boolean;
    onClose: () => void;
    editor: Editor | null;
    selectedText: string;
    selectionRange: { from: number; to: number } | null;
}

export function AIAssistantSidebar({ opened, onClose, editor, selectedText, selectionRange }: AIAssistantSidebarProps) {
    const [instructions, setInstructions] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [originalText, setOriginalText] = useState('');
    const [improvedText, setImprovedText] = useState('');
    const [showDiff, setShowDiff] = useState(false);

    const handleProcess = async () => {
        if (!selectedText || !editor || !selectionRange) {
            showNotification({
                title: 'No Selection',
                message: 'Please select some text in the editor first',
                color: 'red',
            });
            return;
        }

        if (!instructions.trim()) {
            showNotification({
                title: 'No Instructions',
                message: 'Please provide instructions for how to improve the text',
                color: 'red',
            });
            return;
        }

        setIsProcessing(true);
        setOriginalText(selectedText);

        try {
            const response = await api.post('/ai/chat', {
                messages: [
                    {
                        role: 'user',
                        content: `You are editing a Markdown document. ${instructions}\n\nText to improve (in Markdown):\n\`\`\`markdown\n${selectedText}\n\`\`\`\n\nIMPORTANT:\n- Preserve all Markdown formatting (headers, lists, bold, italic, links, etc.)\n- Return ONLY the improved Markdown text\n- Do NOT add explanations, code blocks, or quotes around the response\n- Maintain the document structure`
                    }
                ]
            });

            const result = response.data.trim();
            setImprovedText(result);
            setShowDiff(true);

        } catch (error: any) {
            showNotification({
                title: 'Error',
                message: error?.response?.data?.message || 'Failed to process text',
                color: 'red',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = () => {
        if (!editor || !selectionRange || !improvedText) return;

        // Delete the selected text and insert the improved markdown
        // This preserves the markdown format by letting TipTap parse it
        editor
            .chain()
            .focus()
            .setTextSelection(selectionRange)
            .deleteSelection()
            .insertContent(improvedText, {
                parseOptions: {
                    preserveWhitespace: 'full',
                }
            })
            .run();

        showNotification({
            title: 'Applied',
            message: 'Text has been updated',
            color: 'green',
        });

        // Reset state
        setShowDiff(false);
        setOriginalText('');
        setImprovedText('');
        setInstructions('');
    };

    const handleDiscard = () => {
        setShowDiff(false);
        setOriginalText('');
        setImprovedText('');
    };

    const renderInlineDiff = () => {
        if (!originalText || !improvedText) return null;

        const diff = diffWords(originalText, improvedText);

        return (
            <Stack gap="lg">
                <Box>
                    <Text size="sm" fw={600} mb="sm" c="dark.9">Changes Preview:</Text>
                    <Paper 
                        p="md" 
                        withBorder 
                        bg="gray.0"
                        style={{ 
                            maxHeight: '400px', 
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}
                    >
                        {diff.map((part: Change, index: number) => {
                            const style: React.CSSProperties = {
                                backgroundColor: part.added 
                                    ? '#c3fac3' 
                                    : part.removed 
                                    ? '#ffc9c9' 
                                    : 'transparent',
                                color: '#000',
                                textDecoration: part.removed ? 'line-through' : 'none',
                                display: 'inline',
                                padding: '2px 0'
                            };
                            return <span key={index} style={style}>{part.value}</span>;
                        })}
                    </Paper>
                    <Group gap="sm" mt="xs">
                        <Text size="xs" c="dimmed">
                            <span style={{ backgroundColor: '#ffc9c9', padding: '2px 6px', color: '#000' }}>Removed</span>
                        </Text>
                        <Text size="xs" c="dimmed">
                            <span style={{ backgroundColor: '#c3fac3', padding: '2px 6px', color: '#000' }}>Added</span>
                        </Text>
                    </Group>
                </Box>

                <Divider />

                <Box>
                    <Text size="sm" fw={600} mb="sm" c="dark.9">Full Result (Markdown):</Text>
                    <ScrollArea h={200}>
                        <Paper 
                            p="md" 
                            bg="gray.0"
                            withBorder
                            style={{ 
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                color: '#1a1b1e'
                            }}
                        >
                            {improvedText}
                        </Paper>
                    </ScrollArea>
                </Box>

                <Group justify="center" gap="md" mt="md">
                    <Button 
                        leftSection={<IconCheck size={16} />}
                        onClick={handleApply}
                        color="green"
                        size="md"
                    >
                        Apply Changes
                    </Button>
                    <Button 
                        leftSection={<IconX size={16} />}
                        onClick={handleDiscard}
                        variant="light"
                        color="red"
                        size="md"
                    >
                        Discard
                    </Button>
                </Group>
            </Stack>
        );
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size="xl"
            title={
                <Group gap="xs">
                    <Text fw={600}>AI Assistant</Text>
                    {selectedText && <Badge size="sm" color="grape">{selectedText.length} chars selected</Badge>}
                </Group>
            }
        >
            <Stack gap="md" p="md">
                {!showDiff ? (
                    <>
                        <Box>
                            <Text size="sm" fw={600} mb="xs" c="dark.9">Selected Text:</Text>
                            <ScrollArea h={150}>
                                <Paper 
                                    p="md" 
                                    bg="gray.0"
                                    withBorder
                                    style={{ 
                                        fontFamily: 'monospace',
                                        fontSize: '13px',
                                        whiteSpace: 'pre-wrap',
                                        color: '#1a1b1e'
                                    }}
                                >
                                    {selectedText || 'No text selected'}
                                </Paper>
                            </ScrollArea>
                        </Box>

                        <Textarea
                            label="Instructions"
                            description="Describe how you want to improve the selected text"
                            placeholder="e.g., Make it more professional, fix grammar, simplify the language, add more details..."
                            minRows={4}
                            value={instructions}
                            onChange={(e) => setInstructions(e.currentTarget.value)}
                            styles={{
                                input: { fontSize: '14px' },
                                label: { color: '#1a1b1e' },
                                description: { color: '#868e96' }
                            }}
                        />

                        <Button
                            leftSection={<IconRefresh size={16} />}
                            onClick={handleProcess}
                            loading={isProcessing}
                            disabled={!selectedText || !instructions.trim()}
                            size="md"
                        >
                            Generate Improvement
                        </Button>

                        <Divider />

                        <Box>
                            <Text size="sm" fw={600} mb="sm" c="dark.9">Quick Actions:</Text>
                            <Stack gap="xs">
                                <Button
                                    size="sm"
                                    variant="light"
                                    onClick={() => setInstructions('Improve the clarity and grammar while keeping the same meaning and Markdown formatting')}
                                >
                                    Improve Writing
                                </Button>
                                <Button
                                    size="sm"
                                    variant="light"
                                    onClick={() => setInstructions('Make this more concise while keeping all important information and Markdown formatting')}
                                >
                                    Make Concise
                                </Button>
                                <Button
                                    size="sm"
                                    variant="light"
                                    onClick={() => setInstructions('Expand this with more details and examples, using appropriate Markdown formatting')}
                                >
                                    Expand
                                </Button>
                                <Button
                                    size="sm"
                                    variant="light"
                                    onClick={() => setInstructions('Make this sound more professional and formal while preserving Markdown formatting')}
                                >
                                    Make Professional
                                </Button>
                                <Button
                                    size="sm"
                                    variant="light"
                                    onClick={() => setInstructions('Fix any spelling, grammar, and punctuation errors')}
                                >
                                    Fix Grammar & Spelling
                                </Button>
                            </Stack>
                        </Box>
                    </>
                ) : (
                    renderInlineDiff()
                )}
            </Stack>
        </Drawer>
    );
}
