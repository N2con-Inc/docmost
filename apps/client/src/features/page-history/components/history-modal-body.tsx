import { ScrollArea, Button, Group } from "@mantine/core";
import HistoryList from "@/features/page-history/components/history-list";
import classes from "./history.module.css";
import { useAtom } from "jotai";
import { 
  activeHistoryIdAtom, 
  compareModeAtom, 
  compareVersionsAtom 
} from "@/features/page-history/atoms/history-atoms";
import HistoryView from "@/features/page-history/components/history-view";
import { HistoryDiffView } from "@/features/page-history/components/history-diff-view";
import { useEffect } from "react";

interface Props {
  pageId: string;
}

export default function HistoryModalBody({ pageId }: Props) {
  const [activeHistoryId, setActiveHistoryId] = useAtom(activeHistoryIdAtom);
  const [compareMode, setCompareMode] = useAtom(compareModeAtom);
  const [compareVersions, setCompareVersions] = useAtom(compareVersionsAtom);

  useEffect(() => {
    setActiveHistoryId("");
    setCompareMode(false);
    setCompareVersions({ version1: '', version2: '' });
  }, [pageId]);

  const handleModeToggle = () => {
    setCompareMode(!compareMode);
    setActiveHistoryId("");
    setCompareVersions({ version1: '', version2: '' });
  };

  const canCompare = compareMode && compareVersions.version1 && compareVersions.version2;

  return (
    <div className={classes.sidebarFlex}>
      <nav className={classes.sidebar}>
        <div className={classes.sidebarMain}>
          <Group mb="md" justify="space-between">
            <Button
              size="xs"
              variant={compareMode ? "filled" : "light"}
              onClick={handleModeToggle}
            >
              {compareMode ? "View Mode" : "Compare Mode"}
            </Button>
          </Group>
          <HistoryList pageId={pageId} />
        </div>
      </nav>

      <ScrollArea h="650" w="100%" scrollbarSize={5}>
        <div className={classes.sidebarRightSection}>
          {compareMode && canCompare ? (
            <HistoryDiffView
              fromHistoryId={compareVersions.version1}
              toHistoryId={compareVersions.version2}
            />
          ) : !compareMode && activeHistoryId ? (
            <HistoryView historyId={activeHistoryId} />
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
