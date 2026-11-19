import { useId, useMemo, useState, type ReactNode } from "react";
import { Lock, Star } from "lucide-react";

import { Sheet } from "@/shared/components/ui";

import { partMeta } from "../../utils/parts";
import { cellLabel, cellsByPart, gridCounts, type GridCell } from "../../utils/questionGrid";
import styles from "./QuestionGridDrawer.module.css";

export interface QuestionGridDrawerProps {
  open: boolean;
  onClose: () => void;
  /** From `buildGridCells(groups, …)`. */
  cells: readonly GridCell[];
  /** Jump to a cell's group (locked cells are not clickable). */
  onJump: (cell: GridCell) => void;
  title?: string;
  /** Line under the title; default "Đã làm x/N · Đánh dấu y". */
  subtitle?: ReactNode;
  /** Show the "Đúng / Sai" legend entries (workspace after checks). */
  showResults?: boolean;
  /** Show the "Đã khoá" legend entry (exam room). */
  showLocks?: boolean;
  footer?: ReactNode;
}

/**
 * Question grid drawer (port of StudyChill ExamQuestionGrid + workspace grid): legend with counts,
 * part filter, one accordion per part, cell states answered / correct / wrong / current /
 * flagged / locked. Built on the shared Sheet (focus trap, Escape).
 */
export function QuestionGridDrawer({
  open,
  onClose,
  cells,
  onJump,
  title = "Danh sách câu hỏi",
  subtitle,
  showResults = false,
  showLocks = false,
  footer,
}: QuestionGridDrawerProps) {
  const filterId = useId();
  const [partFilter, setPartFilter] = useState(0);
  const counts = useMemo(() => gridCounts(cells), [cells]);
  const parts = useMemo(() => cellsByPart(cells), [cells]);
  const visible = partFilter ? parts.filter((p) => p.part === partFilter) : parts;

  const legend = [
    { key: "current", label: "Đang làm", value: counts.current },
    { key: "answered", label: "Đã làm", value: counts.answered },
    ...(showResults
      ? [
          { key: "correct", label: "Đúng", value: counts.correct },
          { key: "wrong", label: "Sai", value: counts.wrong },
        ]
      : []),
    { key: "flagged", label: "Đã đánh dấu", value: counts.flagged },
    ...(showLocks ? [{ key: "locked", label: "Đã khoá", value: counts.locked }] : []),
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      className={styles.drawer}
      header={
        <div className={styles.head}>
          <p className={styles.subtitle}>
            {subtitle ?? (
              <>
                Đã làm <strong>{counts.answered}</strong>/{counts.total} · Đánh dấu{" "}
                <strong>{counts.flagged}</strong>
              </>
            )}
          </p>
          <ul className={styles.legend} aria-label="Chú thích">
            {legend.map((item) => (
              <li key={item.key}>
                <i className={styles.swatch} data-kind={item.key} aria-hidden="true" />
                {item.label} <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
          {parts.length > 1 && (
            <label className={styles.filter} htmlFor={filterId}>
              <span>Lọc theo phần (Part)</span>
              <select
                id={filterId}
                value={partFilter}
                onChange={(event) => setPartFilter(Number(event.target.value))}
              >
                <option value={0}>Tất cả</option>
                {parts.map((p) => (
                  <option key={p.part} value={p.part}>
                    Part {p.part} · {partMeta(p.part).name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      }
      footer={footer}
    >
      <div className={styles.parts}>
        {visible.map(({ part, items }) => {
          const answered = items.filter((c) => c.answered).length;
          return (
            <details key={part} className={styles.part} open data-section={partMeta(part).section}>
              <summary>
                <span className={styles.partName}>
                  Part {part} · {partMeta(part).name}
                </span>
                <span className={styles.partCount}>
                  {answered}/{items.length}
                </span>
              </summary>
              <div className={styles.grid}>
                {items.map((cell) => (
                  <button
                    key={cell.questionId}
                    type="button"
                    className={styles.cell}
                    data-answered={cell.answered || undefined}
                    data-flagged={cell.flagged || undefined}
                    data-current={cell.current || undefined}
                    data-locked={cell.locked || undefined}
                    data-result={
                      cell.correct === true
                        ? "correct"
                        : cell.correct === false
                          ? "wrong"
                          : undefined
                    }
                    disabled={cell.locked}
                    aria-current={cell.current ? "step" : undefined}
                    aria-label={cellLabel(cell)}
                    onClick={() => onJump(cell)}
                  >
                    {cell.number}
                    {cell.flagged && <Star size={9} className={styles.star} aria-hidden="true" />}
                    {cell.locked && <Lock size={9} className={styles.lock} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </Sheet>
  );
}
