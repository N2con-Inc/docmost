import { Text, Group, UnstyledButton, Checkbox } from "@mantine/core";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { formattedDate } from "@/lib/time";
import classes from "./history.module.css";
import clsx from "clsx";

interface HistoryItemProps {
  historyItem: any;
  onSelect: (id: string) => void;
  isActive: boolean;
  compareMode?: boolean;
}

function HistoryItem({ historyItem, onSelect, isActive, compareMode = false }: HistoryItemProps) {
  const handleClick = () => {
    onSelect(historyItem.id);
  };

  return (
    <UnstyledButton
      p="xs"
      onClick={handleClick}
      className={clsx(classes.history, { [classes.active]: isActive })}
    >
      <Group wrap="nowrap" gap="xs">
        {compareMode && (
          <Checkbox
            checked={isActive}
            onChange={handleClick}
            tabIndex={-1}
            style={{ pointerEvents: 'auto' }}
          />
        )}
        <div style={{ flex: 1 }}>
          <Text size="sm">
            {formattedDate(new Date(historyItem.createdAt))}
          </Text>

          <div>
            <Group gap={4} wrap="nowrap">
              <CustomAvatar
                size="sm"
                avatarUrl={historyItem.lastUpdatedBy.avatarUrl}
                name={historyItem.lastUpdatedBy.name}
              />
              <Text size="sm" c="dimmed" lineClamp={1}>
                {historyItem.lastUpdatedBy.name}
              </Text>
            </Group>
          </div>
        </div>
      </Group>
    </UnstyledButton>
  );
}

export default HistoryItem;
