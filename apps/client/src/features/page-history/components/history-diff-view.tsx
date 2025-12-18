import React, { useMemo } from 'react';
import { Box, Title, Text, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { usePageHistoryQuery } from '@/features/page-history/queries/page-history-query';
import { HistoryDiffRenderer } from './history-diff-renderer';
import { computeContentDiff, hasSignificantChanges } from '../utils/content-diff';

interface HistoryDiffViewProps {
  fromHistoryId: string;
  toHistoryId: string;
}

/**
 * Main diff view component that fetches two versions and displays their diff
 */
export function HistoryDiffView({ fromHistoryId, toHistoryId }: HistoryDiffViewProps) {
  const { data: fromVersion, isLoading: isLoadingFrom, isError: isErrorFrom } = usePageHistoryQuery(fromHistoryId);
  const { data: toVersion, isLoading: isLoadingTo, isError: isErrorTo } = usePageHistoryQuery(toHistoryId);

  // Compute diff when both versions are loaded
  const diffResult = useMemo(() => {
    if (!fromVersion || !toVersion) {
      return null;
    }

    return computeContentDiff(fromVersion.content, toVersion.content, 'words');
  }, [fromVersion, toVersion]);

  // Loading state
  if (isLoadingFrom || isLoadingTo) {
    return (
      <Box p="md">
        <Text c="dimmed">Loading versions...</Text>
      </Box>
    );
  }

  // Error state
  if (isErrorFrom || isErrorTo) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        Failed to load one or both versions for comparison.
      </Alert>
    );
  }

  // No diff result
  if (!diffResult) {
    return (
      <Box p="md">
        <Text c="dimmed">Unable to compute diff.</Text>
      </Box>
    );
  }

  // Check if there are significant changes
  const hasChanges = hasSignificantChanges(diffResult.changes);

  return (
    <Box>
      {/* Version info */}
      <Box mb="lg">
        <Title order={4} mb="xs">Comparing Versions</Title>
        <Text size="sm" c="dimmed">
          From: {fromVersion?.title || 'Untitled'} 
          {fromVersion?.lastUpdatedBy && ` (by ${fromVersion.lastUpdatedBy.name})`}
        </Text>
        <Text size="sm" c="dimmed">
          To: {toVersion?.title || 'Untitled'}
          {toVersion?.lastUpdatedBy && ` (by ${toVersion.lastUpdatedBy.name})`}
        </Text>
      </Box>

      {/* No changes message */}
      {!hasChanges && (
        <Alert icon={<IconAlertCircle size={16} />} title="No Changes" color="blue">
          These versions appear to be identical.
        </Alert>
      )}

      {/* Diff display */}
      {hasChanges && (
        <HistoryDiffRenderer diffResult={diffResult} maxHeight={700} />
      )}
    </Box>
  );
}

export default HistoryDiffView;
