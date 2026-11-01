import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import {
  Badge,
  Button,
  DataToolbar,
  EmptyState,
  ErrorState,
  ProgressBar,
  Segmented,
  Skeleton,
  type SegmentedOption,
} from "@/shared/components/ui";

import { useStageProgress } from "../hooks/useStageProgress";
import { useStageSets } from "../hooks/useStageSets";
import type { ProgressCounts, StageDto } from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import {
  LESSON_STATUS_LABELS,
  formatCount,
  formatPercent,
  lessonStatus,
  progressRatio,
  startedCount,
  toCounts,
  type LessonStatus,
} from "../utils/vocabulary-format";
import styles from "./LessonGrid.module.css";
import { LessonTile } from "./LessonTile";

type Filter = "all" | LessonStatus;

const STATUSES: LessonStatus[] = ["new", "learning", "done"];

interface LessonGridProps {
  stage: StageDto;
  signedIn: boolean;
  /** Stage totals for the progress on the header row. */
  progress: ProgressCounts;
  onBack: () => void;
}

/**
 * Lessons of the selected stage. The header is one row (back · count · filter · progress);
 * the stage name lives in the sidebar. Remount per stage (key) to reset the filter.
 */
export function LessonGrid({ stage, signedIn, progress, onBack }: LessonGridProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const setsQuery = useStageSets(stage.id);
  const progressQuery = useStageProgress(stage.id, signedIn);

  const lessons = useMemo(() => {
    const progressBySet = new Map((progressQuery.data ?? []).map((row) => [row.setId, row]));
    return [...(setsQuery.data ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((set) => {
        const counts = toCounts(set.wordCount, progressBySet.get(set.id));
        return { set, counts, status: lessonStatus(counts) };
      });
  }, [setsQuery.data, progressQuery.data]);

  const nextId =
    signedIn && progressQuery.data
      ? lessons.find((lesson) => lesson.status !== "done")?.set.id
      : undefined;

  const visible = filter === "all" ? lessons : lessons.filter((l) => l.status === filter);
  const options: SegmentedOption<Filter>[] = [
    { value: "all", label: "Tất cả", count: lessons.length },
    ...STATUSES.map((status) => ({
      value: status,
      label: LESSON_STATUS_LABELS[status],
      count: lessons.filter((l) => l.status === status).length,
    })),
  ];
  const ratio = progressRatio(progress);

  return (
    <section className={styles.section} aria-label={stage.title}>
      <div className={styles.head}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>
          Tổng quan
        </Button>
        <Badge size="md">{formatCount(stage.setCount)} bài</Badge>
        {signedIn && (
          <DataToolbar
            className={styles.toolbar}
            leading={
              <Segmented
                variant="subtle"
                label="Trạng thái bài học"
                value={filter}
                onChange={setFilter}
                options={options}
              />
            }
          />
        )}
        {signedIn && (
          <div className={styles.progress}>
            <span className={styles.progressText}>
              {formatCount(startedCount(progress))}/{formatCount(progress.wordCount)} ·{" "}
              <strong>{formatPercent(ratio)}</strong>
            </span>
            <ProgressBar value={ratio} max={1} size="xs" tone="tone" label="Tiến độ chặng" />
          </div>
        )}
      </div>

      {setsQuery.isPending ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} shape="block" height={212} />
          ))}
        </div>
      ) : setsQuery.isError ? (
        <ErrorState
          image={errorMascot}
          title={getVocabularyErrorMessage(setsQuery.error)}
          onRetry={() => void setsQuery.refetch()}
        />
      ) : visible.length === 0 ? (
        <EmptyState image={emptyMascot} title="Chưa có bài học" />
      ) : (
        <ul className={styles.grid}>
          {visible.map(({ set, counts }) => (
            <li key={set.id}>
              <LessonTile
                to={`/vocabulary/sets/${set.id}`}
                order={set.order}
                wordCount={set.wordCount}
                previewWords={set.previewWords}
                lastWord={set.lastWord}
                progress={counts}
                showProgress={signedIn}
                isNext={set.id === nextId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
