import type { CSSProperties } from "react";

import { cx, type Tone } from "../types";
import styles from "./ProgressBar.module.css";

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: Tone;
  size?: "xs" | "sm" | "md";
  /** Light track for dark backgrounds. */
  inverted?: boolean;
  label: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  tone = "blue",
  size = "sm",
  inverted = false,
  label,
  className,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      className={cx(styles.track, className)}
      data-size={size}
      data-tone={tone}
      data-inverted={inverted || undefined}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <span className={styles.fill} style={{ "--progress": `${ratio * 100}%` } as CSSProperties} />
    </div>
  );
}
