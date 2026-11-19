import type { CSSProperties } from "react";

import { cx } from "@/shared/components/ui";

import type { ToeicSection } from "../../types/practice-exam.types";
import { percentOf } from "../../utils/scoreDisplay";
import styles from "./SectionBar.module.css";

export interface SectionBarProps {
  section: ToeicSection;
  /** Scaled section score (5..495), or null when the section is not complete (shows %). */
  scaled: number | null;
  correct: number;
  total: number;
  /** Override the heading (default "Listening" / "Reading"). */
  title?: string;
  className?: string;
}

/** Listening / Reading score card: "/495" (or % when not scaled), bar, "Đúng a/b câu". */
export function SectionBar({ section, scaled, correct, total, title, className }: SectionBarProps) {
  const percent = percentOf(correct, total);
  const fill = scaled !== null ? (scaled / 495) * 100 : percent;
  const heading = title ?? (section === "listening" ? "Listening" : "Reading");
  return (
    <div className={cx(styles.section, className)} data-section={section}>
      <div className={styles.head}>
        <span className={styles.title}>{heading}</span>
        <span className={styles.score}>
          {scaled !== null ? (
            <>
              <strong>{scaled}</strong>/495
            </>
          ) : (
            <strong>{percent}%</strong>
          )}
        </span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={`${heading}: đúng ${correct}/${total}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill)}
      >
        <span style={{ "--fill": `${fill}%` } as CSSProperties} />
      </div>
      <p className={styles.meta}>
        Đúng {correct}/{total} câu
      </p>
    </div>
  );
}
