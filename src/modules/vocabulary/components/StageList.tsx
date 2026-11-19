import type { ProgressCounts, StageDto } from "../types/vocabulary.types";
import { stageToneStyle } from "../utils/stage-tones";
import { formatPercent, formatToeicTarget, progressRatio } from "../utils/vocabulary-format";
import { SidebarRow } from "./SidebarRow";
import styles from "./StageList.module.css";

export interface StageStation {
  stage: StageDto;
  progress: ProgressCounts;
}

interface StageListProps {
  stations: StageStation[];
  selectedId: string | null;
  /** Last stage the learner opened (marked, not selected). */
  recentId: string | null;
  showProgress: boolean;
  onSelect: (stageId: string) => void;
}

/** Five compact stage rows in their stage tones. */
export function StageList({
  stations,
  selectedId,
  recentId,
  showProgress,
  onSelect,
}: StageListProps) {
  return (
    <nav className={styles.list} aria-label="Chặng">
      {stations.map(({ stage, progress }, index) => {
        const ratio = progressRatio(progress);
        return (
          <SidebarRow
            key={stage.id}
            style={stageToneStyle(stage.order)}
            selected={stage.id === selectedId}
            recent={stage.id === recentId}
            title={`${stage.title} · ${stage.description}`}
            leading={index + 1}
            label={
              <>
                <span className={styles.target}>{formatToeicTarget(stage.toeicTarget)}</span>
                <span>{stage.title}</span>
              </>
            }
            meta={showProgress ? formatPercent(ratio) : `${stage.setCount} bài`}
            progress={showProgress ? ratio : undefined}
            onClick={() => onSelect(stage.id)}
          />
        );
      })}
    </nav>
  );
}
