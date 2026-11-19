import { Timer } from "lucide-react";

import { cx } from "@/shared/components/ui";

import { formatClock } from "../../utils/scoreDisplay";
import styles from "./ClockBadge.module.css";

export interface ClockBadgeProps {
  /** Seconds (remaining or elapsed); null shows "--:--". */
  seconds: number | null;
  /** Red + pulse (≤ 5 minutes left). */
  warning?: boolean;
  /** Visible prefix, e.g. "Còn lại". */
  label?: string;
  className?: string;
}

/** Exam clock pill: mm:ss or h:mm:ss, red and pulsing in the last 5 minutes. */
export function ClockBadge({ seconds, warning = false, label, className }: ClockBadgeProps) {
  const text = seconds === null ? "--:--" : formatClock(seconds);
  return (
    <span
      className={cx(styles.clock, className)}
      data-warning={warning || undefined}
      role="timer"
      aria-live="off"
      aria-label={`${label ?? "Thời gian"} ${text}`}
    >
      <Timer size={16} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
      <strong className={styles.value}>{text}</strong>
    </span>
  );
}
