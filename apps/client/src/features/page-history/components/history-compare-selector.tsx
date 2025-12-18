import React from 'react';
import { Box, Select, Button, Group, Text, Stack } from '@mantine/core';
import { IconGitCompare } from '@tabler/icons-react';

export interface PageHistorySummary {
  id: string;
  title: string;
  createdAt: string;
  lastUpdatedBy?: {
    name: string;
  };
}

interface HistoryCompareSelectorProps {
  histories: PageHistorySummary[];
  fromHistoryId: string | null;
  toHistoryId: string | null;
  onFromChange: (historyId: string | null) => void;
  onToChange: (historyId: string | null) => void;
  onCompare: () => void;
}

/**
 * UI for selecting two versions to compare
 */
export function HistoryCompareSelector({
  histories,
  fromHistoryId,
  toHistoryId,
  onFromChange,
  onToChange,
  onCompare,
}: HistoryCompareSelectorProps) {
  // Format history items for select dropdown
  const historyOptions = histories.map((history) => ({
    value: history.id,
    label: formatHistoryLabel(history),
  }));

  const canCompare = fromHistoryId && toHistoryId && fromHistoryId !== toHistoryId;

  return (
    <Box p="md">
      <Stack gap="md">
        <Text size="sm" fw={500}>
          Select two versions to compare
        </Text>

        <Group grow>
          <Select
            label="From (older version)"
            placeholder="Select version"
            data={historyOptions}
            value={fromHistoryId}
            onChange={onFromChange}
            searchable
            clearable
          />

          <Select
            label="To (newer version)"
            placeholder="Select version"
            data={historyOptions}
            value={toHistoryId}
            onChange={onToChange}
            searchable
            clearable
          />
        </Group>

        {fromHistoryId && toHistoryId && fromHistoryId === toHistoryId && (
          <Text size="sm" c="red">
            Please select two different versions
          </Text>
        )}

        <Button
          leftSection={<IconGitCompare size={16} />}
          onClick={onCompare}
          disabled={!canCompare}
          fullWidth
        >
          Show Diff
        </Button>
      </Stack>
    </Box>
  );
}

/**
 * Format history item for display in dropdown
 */
function formatHistoryLabel(history: PageHistorySummary): string {
  const date = new Date(history.createdAt).toLocaleString();
  const author = history.lastUpdatedBy?.name || 'Unknown';
  return `${date} - ${author}`;
}
