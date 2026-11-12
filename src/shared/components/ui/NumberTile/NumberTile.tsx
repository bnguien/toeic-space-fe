import type { ReactNode } from "react";

import { ProgressBar } from "../ProgressBar/ProgressBar";
import { cx, type Tone } from "../types";
import styles from "./NumberTile.module.css";

export interface NumberTileProps {
  /** Small-caps label above the number, e.g. "BÀI" or "CHẶNG 01". */
  label?: ReactNode;
  value: ReactNode;
  /** Small text right after the number, e.g. "TOEIC". */
  suffix?: ReactNode;
  /** Muted line under the number. */
  caption?: ReactNode;
  /** 0..1 — draws a thin bar under the caption. */
  progress?: number;
  progressLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "start" | "end";
  /** Colour of the number; "mark" is the yellow highlight on dark panels. */
  tone?: Tone;
  /** Light text on a dark background. */
  inverted?: boolean;
  className?: string;
}

/** Typographic big-number block, with no border of its own. */
export function NumberTile({
  label,
  value,
  suffix,
  caption,
  progress,
  progressLabel,
  size = "md",
  align = "start",
  tone,
  inverted = false,
  className,
}: NumberTileProps) {
  return (
    <div
      className={cx(styles.tile, className)}
      data-size={size}
      data-align={align}
      data-tone={tone}
      data-inverted={inverted || undefined}
    >
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.value}>
        {value}
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
      {caption && <span className={styles.caption}>{caption}</span>}
      {progress !== undefined && (
        <ProgressBar
          className={styles.bar}
          value={progress}
          max={1}
          size="xs"
          tone={inverted ? "mark" : "tone"}
          inverted={inverted}
          label={progressLabel ?? `${Math.round(progress * 100)}%`}
        />
      )}
    </div>
  );
}
