import React from 'react';
import { BubbleMenu, Editor } from '@tiptap/react';
import { ActionIcon, Group, Paper, Text, Tooltip } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useAIContext } from '../context/ai-provider';
import { useAI } from '../hooks/use-ai';

interface AIMenuProps {
    editor: Editor;
}

export function AIMenu({ editor }: AIMenuProps) {
    const { setChatOpen } = useAIContext();
    const { sendMessage } = useAI();

    const handleAskAI = () => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to);

        if (text) {
            setChatOpen(true);
            sendMessage(`Context: "${text}"\n\nUser: Please explain or improve this text.`);
        }
    };

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            shouldShow={({ editor, from, to }) => {
                // Only show if selection is not empty
                return !editor.state.selection.empty;
            }}
        >
            <Paper shadow="md" radius="md" p={4} withBorder>
                <Group gap={4}>
                    <Tooltip label="Ask AI">
                        <ActionIcon variant="light" color="grape" onClick={handleAskAI}>
                            <IconSparkles size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Paper>
        </BubbleMenu>
    );
}
