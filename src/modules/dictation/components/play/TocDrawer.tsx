/**
 * Contents of the play screen: done sentences show the English sentence + meaning; sentences not done yet
 * ONLY show the Vietnamese meaning (never the answer). Click to jump to any unlocked sentence.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleDashed, Eye, Lightbulb, Lock, X } from "lucide-react";

import { cx } from "@/shared/components/ui";

import type { SentenceStatus } from "../../types/play.types";
import panel from "./PlayPanel.module.css";
import styles from "./TocDrawer.module.css";

/** One row built by the session. */
export interface PlayRow {
  i: number;
  key: string;
  number: number;
  status: SentenceStatus | null;
  sentence: string;
  translation: string;
  locked: boolean;
  done: boolean;
}

const STATUS: Record<SentenceStatus, { label: string; icon: ReactNode; className: string }> = {
  clean: { label: "Sạch", icon: <CheckCircle2 size={16} />, className: styles.clean },
  passed: { label: "Đã đạt", icon: <Lightbulb size={16} />, className: styles.passed },
  revealed: { label: "Đã xem đáp án", icon: <Eye size={16} />, className: styles.revealed },
};

type Filter = "all" | "done" | "todo" | "review";

interface TocDrawerProps {
  rows: PlayRow[];
  currentIndex: number | undefined;
  onJump: (index: number) => void;
  onClose: () => void;
}

export function TocDrawer({ rows, currentIndex, onJump, onClose }: TocDrawerProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const panelRef = useRef<HTMLElement>(null);
  const currentRow = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    currentRow.current?.scrollIntoView({ block: "center" });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  const counts = useMemo(() => {
    const done = rows.filter((r) => r.done).length;
    return {
      all: rows.length,
      done,
      todo: rows.length - done,
      review: rows.filter((r) => r.status === "revealed").length,
    };
  }, [rows]);

  const shown = rows.filter(
    (r) =>
      filter === "all" ||
      (filter === "done" ? r.done : filter === "todo" ? !r.done : r.status === "revealed"),
  );
  const filters: [Filter, string, number][] = [
    ["all", "Tất cả", counts.all],
    ["done", "Đã làm", counts.done],
    ["todo", "Chưa làm", counts.todo],
    ["review", "Cần ôn", counts.review],
  ];

  return (
    <div
      className={panel.layer}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className={cx(panel.panel, panel.left)}
        role="dialog"
        aria-modal="true"
        aria-label="Mục lục câu"
        tabIndex={-1}
        data-play-panel=""
      >
        <header className={panel.head}>
          <h3>
            Mục lục · {counts.done}/{counts.all} câu
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng mục lục">
            <X size={18} />
          </button>
        </header>
        <div className={cx(panel.segmented, styles.filters)} role="radiogroup" aria-label="Lọc câu">
          {filters.map(([key, name, n]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={filter === key}
              className={filter === key ? panel.active : undefined}
              onClick={() => setFilter(key)}
            >
              {name} <small>{n}</small>
            </button>
          ))}
        </div>
        <ol className={styles.list}>
          {shown.map((r) => {
            const status = r.status ? STATUS[r.status] : null;
            const current = r.i === currentIndex;
            const title = r.done
              ? r.sentence || r.translation || "Đã đạt"
              : r.translation || (r.locked ? "Chưa mở khoá" : "Nghe để mở nghĩa câu này");
            const note = r.done
              ? r.sentence
                ? r.translation
                : ""
              : r.locked
                ? "Đạt câu trước để mở"
                : "Chưa làm · nghe rồi viết để mở câu tiếng Anh";
            return (
              <li key={r.key} ref={current ? currentRow : undefined}>
                <button
                  type="button"
                  disabled={r.locked}
                  className={cx(styles.row, current && styles.current, status?.className)}
                  onClick={() => onJump(r.i)}
                >
                  <span className={styles.number}>{String(r.number).padStart(2, "0")}</span>
                  <span className={styles.text}>
                    <strong className={r.done && r.sentence ? undefined : styles.meaning}>
                      {title}
                    </strong>
                    {note && <small>{note}</small>}
                  </span>
                  <span
                    className={styles.state}
                    title={status ? status.label : r.locked ? "Chưa mở khoá" : "Chưa làm"}
                  >
                    {status ? (
                      status.icon
                    ) : r.locked ? (
                      <Lock size={15} />
                    ) : (
                      <CircleDashed size={16} />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {!shown.length && <li className={styles.empty}>Không có câu nào ở mục này.</li>}
        </ol>
      </section>
    </div>
  );
}
