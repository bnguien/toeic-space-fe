import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Button, Card, Eyebrow, NumberTile, SelectionBar, type Tone } from "@/shared/components/ui";
import { useSelection } from "@/shared/hooks/useSelection";

import type { StudyItemDto } from "../types/vocabulary.types";
import styles from "./SessionSummary.module.css";
import { WordView } from "./WordView";

export interface SummaryStat {
  label: string;
  value: number;
  tone?: Tone;
}

interface SessionSummaryProps {
  image?: string;
  eyebrow?: string;
  title: string;
  stats: SummaryStat[];
  /** Words to look at again; all selected at first. */
  items: StudyItemDto[];
  /** Trailing control per word row (e.g. the save toggle). */
  rowExtra?: (item: StudyItemDto) => ReactNode;
  /** Studies the selected words again. */
  onReview?: (wordIds: string[]) => void;
  /** Leave / back action. */
  action?: ReactNode;
}

export function SessionSummary({
  image,
  eyebrow = "Kết quả",
  title,
  stats,
  items,
  rowExtra,
  onReview,
  action,
}: SessionSummaryProps) {
  const selection = useSelection(
    items.map((item) => item.word.id),
    "all",
  );

  return (
    <Card
      as="section"
      variant="paper"
      padding="lg"
      className={styles.summary}
      aria-labelledby="session-summary-title"
    >
      <div className={styles.head}>
        {image && <img className={styles.image} src={image} alt="" />}
        <div className={styles.heading}>
          <Eyebrow accent>{eyebrow}</Eyebrow>
          <h2 id="session-summary-title" className={styles.title}>
            {title}
          </h2>
        </div>
        <Card variant="panel" padding="none" className={styles.stats}>
          {stats.map((stat) => (
            <NumberTile
              key={stat.label}
              className={styles.stat}
              tone={stat.tone}
              label={stat.label}
              value={stat.value}
              size="sm"
              inverted
            />
          ))}
        </Card>
      </div>

      {items.length > 0 && (
        <Card as="section" variant="outline" padding="none" aria-label="Từ cần ôn">
          <ul className={styles.list}>
            {items.map((item) => {
              const checked = selection.isSelected(item.word.id);
              return (
                <li key={item.word.id} className={styles.row} data-selected={checked || undefined}>
                  {onReview && (
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={checked}
                        aria-label={`Chọn ${item.word.headword}`}
                        onChange={() => undefined}
                        onClick={(event) => selection.toggle(item.word.id, event.shiftKey)}
                      />
                    </label>
                  )}
                  <WordView word={item.word} density="row" aside={rowExtra?.(item)} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {items.length > 0 && onReview ? (
        <SelectionBar
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
                Ôn lại {selection.count} từ
              </Button>
            </>
          }
        />
      ) : (
        action && <div className={styles.actions}>{action}</div>
      )}
    </Card>
  );
}
