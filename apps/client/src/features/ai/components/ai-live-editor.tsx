import React from 'react';
import { ActionIcon, Badge, Box, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconX, IconEye, IconReplace, IconArrowBigDownLine } from '@tabler/icons-react';
import { PreviewState } from '../hooks/use-ai-live-edit';

export interface AILiveEditorProps {
    previewState: PreviewState;
    onApply: () => void;
    onRevert: () => void;
}

/**
 * Component for displaying and controlling live AI edits with preview
 */
export function AILiveEditor({ previewState, onApply, onRevert }: AILiveEditorProps) {
    if (!previewState.isActive) {
        return null;
    }

    const getModeIcon = () => {
        switch (previewState.mode) {
            case 'insert':
                return <IconArrowBigDownLine size={14} />;
            case 'replace':
                return <IconReplace size={14} />;
            case 'append':
                return <IconArrowBigDownLine size={14} />;
            default:
                return <IconEye size={14} />;
        }
    };

    const getModeLabel = () => {
        switch (previewState.mode) {
            case 'insert':
                return 'Insert at cursor';
            case 'replace':
                return 'Replace selection';
            case 'append':
                return 'Append to document';
            default:
                return 'Preview';
        }
    };

    return (
        <Box
            style={{
                position: 'fixed',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--mantine-color-body)',
                border: '2px solid var(--mantine-color-blue-filled)',
                borderRadius: 12,
                padding: '12px 20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 300,
                minWidth: 400,
                maxWidth: 600,
            }}
        >
            <Stack gap="xs">
                <Group justify="space-between" align="center">
                    <Group gap="xs">
                        <Badge
                            size="lg"
                            variant="light"
                            color="blue"
                            leftSection={getModeIcon()}
                        >
                            Preview Mode
                        </Badge>
                        <Text size="sm" c="dimmed">
                            {getModeLabel()}
                        </Text>
                    </Group>
                </Group>

                <Text size="xs" c="dimmed" style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {previewState.previewContent.substring(0, 150)}
                    {previewState.previewContent.length > 150 ? '...' : ''}
                </Text>

                <Group justify="center" gap="md" mt="xs">
                    <Button
                        variant="filled"
                        color="green"
                        size="sm"
                        leftSection={<IconCheck size={16} />}
                        onClick={onApply}
                    >
                        Apply Changes
                    </Button>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="sm"
                        leftSection={<IconX size={16} />}
                        onClick={onRevert}
                    >
                        Discard
                    </Button>
                </Group>
            </Stack>
        </Box>
    );
}
