import { History } from "lucide-react";

import { cx } from "@/shared/components/ui";

import type { QuestionHistoryEntry } from "../../types/practice-exam.types";
import styles from "./QuestionHistoryTags.module.css";

export interface QuestionHistoryTagsProps {
  /** Up to 5 earlier answers from other attempts (reveal `history`). */
  history: readonly QuestionHistoryEntry[];
  className?: string;
}

const shortDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

const verdict = (entry: QuestionHistoryEntry) =>
  entry.isCorrect === true
    ? "✓ Đúng"
    : entry.isCorrect === false
      ? `× Sai (${entry.userAnswer ?? "—"})`
      : "– Bỏ qua";

/** "Lịch sử làm câu này (n lần)": "Lần k: ✓ Đúng / × Sai (B) / – Bỏ qua · dd/mm", oldest first. */
export function QuestionHistoryTags({ history, className }: QuestionHistoryTagsProps) {
  if (history.length === 0) return null;
  const ordered = [...history].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
  return (
    <div className={cx(styles.history, className)}>
      <p className={styles.title}>
        <History size={14} aria-hidden="true" />
        Lịch sử làm câu này ({history.length} lần)
      </p>
      <ul className={styles.tags}>
        {ordered.map((entry, i) => {
          const tone =
            entry.isCorrect === true ? "correct" : entry.isCorrect === false ? "wrong" : "skip";
          const date = shortDate(entry.answeredAt);
          return (
            <li
              key={`${entry.attemptId}:${entry.answeredAt}`}
              className={styles.tag}
              data-tone={tone}
            >
              Lần {i + 1}: {verdict(entry)}
              {date && <span className={styles.date}> · {date}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
