import React from 'react';
import { Box, Text, ScrollArea, Badge, Group, useMantineColorScheme } from '@mantine/core';
import { Change } from 'diff';
import { DiffResult, formatDiffStats } from '../utils/content-diff';

export interface HistoryDiffRendererProps {
  diffResult: DiffResult;
  maxHeight?: number;
}

/**
 * Renders a unified diff view with color-coded changes
 */
export function HistoryDiffRenderer({ diffResult, maxHeight = 600 }: HistoryDiffRendererProps) {
  const { changes, stats } = diffResult;
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Box>
      {/* Diff Statistics */}
      <Group gap="md" mb="md">
        <Badge size="lg" variant="light" color="gray">
          {formatDiffStats(stats)}
        </Badge>
        {stats.added > 0 && (
          <Badge size="sm" variant="light" color="green">
            +{stats.added}
          </Badge>
        )}
        {stats.removed > 0 && (
          <Badge size="sm" variant="light" color="red">
            -{stats.removed}
          </Badge>
        )}
      </Group>

      {/* Diff Content - Line by line */}
      <ScrollArea style={{ maxHeight }}>
        <Box
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            lineHeight: '1.8',
            backgroundColor: isDark ? '#1a1b1e' : '#ffffff',
            borderRadius: '8px',
            border: isDark ? '1px solid #373a40' : '1px solid #dee2e6',
            overflow: 'hidden',
          }}
        >
          {changes.map((change, index) => {
            // Split into lines for better display
            const lines = change.value.split('\n');
            
            return lines.map((line, lineIndex) => {
              // Skip empty trailing lines
              if (!line.trim() && lineIndex === lines.length - 1) return null;
              
              let bgColor = 'transparent';
              let textColor = isDark ? '#c1c2c5' : '#212529';
              let borderColor = 'transparent';
              let prefix = '  ';
              
              if (change.added) {
                bgColor = isDark ? '#0d3a0d' : '#e6ffed';
                textColor = isDark ? '#a3f0a3' : '#0d5e0d';
                borderColor = isDark ? '#2ea043' : '#2da44e';
                prefix = '+ ';
              } else if (change.removed) {
                bgColor = isDark ? '#4a0a0a' : '#ffebe9';
                textColor = isDark ? '#ff8080' : '#d32f2f';
                borderColor = isDark ? '#f85149' : '#cf222e';
                prefix = '- ';
              }
              
              return (
                <Box
                  key={`${index}-${lineIndex}`}
                  style={{
                    padding: '4px 16px',
                    backgroundColor: bgColor,
                    borderLeft: `3px solid ${borderColor}`,
                  }}
                >
                  <Text
                    component="span"
                    style={{
                      color: textColor,
                      fontWeight: (change.added || change.removed) ? 500 : 400,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Text component="span" style={{ opacity: 0.5, marginRight: '8px' }}>
                      {prefix}
                    </Text>
                    {line || ' '}
                  </Text>
                </Box>
              );
            });
          })}
        </Box>
      </ScrollArea>
    </Box>
  );
}
