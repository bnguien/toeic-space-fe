import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Button, NumberTile, SelectionBar, type Tone } from "@/shared/components/ui";
import { useSelection } from "@/shared/hooks/useSelection";

import type { StudyItemDto } from "../types/vocabulary.types";
import styles from "./SessionSummary.module.css";
import { WordSelectList } from "./WordSelectList";

export interface SummaryStat {
  label: string;
  value: number;
  tone?: Tone;
}

interface SessionSummaryProps {
  image?: string;
  title: string;
  stats: SummaryStat[];
  /** Words to look at again; all selected at first. */
  items: StudyItemDto[];
  /** Trailing controls per word row (e.g. edit and save). */
  rowExtra?: (item: StudyItemDto) => ReactNode;
  /** Studies the selected words again. */
  onReview?: (wordIds: string[]) => void;
  /** Label of the review button for `count` selected words. */
  reviewLabel?: (count: number) => string;
  /** Leave / back action. */
  action?: ReactNode;
}

/** End of a session: mascot, stats, the words to review (selectable) and the next actions. */
export function SessionSummary({
  image,
  title,
  stats,
  items,
  rowExtra,
  onReview,
  reviewLabel = (count) => `Ôn lại ${count} từ`,
  action,
}: SessionSummaryProps) {
  const selection = useSelection(
    items.map((item) => item.word.id),
    "all",
  );
  const byWord = new Map(items.map((item) => [item.word.id, item]));

  return (
    <section className={styles.summary} aria-labelledby="session-summary-title">
      <div className={styles.head}>
        {image && <img className={styles.image} src={image} alt="" />}
        <h2 id="session-summary-title" className={styles.title}>
          {title}
        </h2>
        <div className={styles.stats}>
          {stats.map((stat) => (
            <NumberTile
              key={stat.label}
              className={styles.stat}
              tone={stat.tone}
              label={stat.label}
              value={stat.value}
              size="sm"
            />
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <WordSelectList
          className={styles.list}
          label="Từ cần ôn"
          words={items.map((item) => item.word)}
          isSelected={selection.isSelected}
          onToggle={selection.toggle}
          aside={(word) => {
            const item = byWord.get(word.id);
            return item && rowExtra ? rowExtra(item) : null;
          }}
        />
      )}

      {items.length > 0 && onReview ? (
        <SelectionBar
          className={styles.bar}
          count={selection.count}
          total={selection.total}
          onSelectAll={selection.selectAll}
          onClear={selection.clear}
          actions={
            <>
              {action}
              <Button
                variant="primary"
                icon={<RotateCcw size={18} />}
                disabled={selection.count === 0}
                onClick={() => onReview(selection.selectedIds)}
              >
                {reviewLabel(selection.count)}
              </Button>
            </>
          }
        />
      ) : (
        action && <div className={styles.actions}>{action}</div>
      )}
    </section>
  );
}
