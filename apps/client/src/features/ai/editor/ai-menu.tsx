import React, { useState } from 'react';
import { BubbleMenu, Editor } from '@tiptap/react';
import { ActionIcon, Paper, Tooltip } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { AIAssistantSidebar } from '../components/ai-assistant-sidebar';

interface AIMenuProps {
    editor: Editor;
}

export function AIMenu({ editor }: AIMenuProps) {
    const [sidebarOpened, setSidebarOpened] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);

    const handleOpenSidebar = () => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to);
        
        if (text) {
            setSelectedText(text);
            setSelectionRange({ from: selection.from, to: selection.to });
            setSidebarOpened(true);
        }
    };

    return (
        <>
            <BubbleMenu
                editor={editor}
                tippyOptions={{ 
                    duration: 100, 
                    placement: 'top',
                    interactive: true,
                    hideOnClick: false
                }}
                shouldShow={({ editor }) => {
                    return !editor.state.selection.empty;
                }}
            >
                <Paper 
                    shadow="md" 
                    radius="md" 
                    p={4} 
                    withBorder
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <Tooltip label="Ask AI to improve this text">
                        <ActionIcon 
                            variant="light" 
                            color="grape"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleOpenSidebar}
                        >
                            <IconSparkles size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Paper>
            </BubbleMenu>

            <AIAssistantSidebar
                opened={sidebarOpened}
                onClose={() => setSidebarOpened(false)}
                editor={editor}
                selectedText={selectedText}
                selectionRange={selectionRange}
            />
        </>
    );
}
