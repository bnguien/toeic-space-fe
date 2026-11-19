import { cx } from "@/shared/components/ui";

import styles from "./ScoreRing.module.css";

export interface ScoreRingProps {
  value: number;
  max: number;
  /** Big centre text; default `value`. */
  label?: string;
  /** Small text under the label, e.g. "/990" or "đúng". */
  caption?: string;
  /** Diameter in px (default 148). */
  size?: number;
  tone?: "blue" | "rose" | "correct";
  /** Accessible description, e.g. "Điểm dự đoán 650 trên 990". */
  ariaLabel?: string;
  className?: string;
}

/** Circular score gauge (total /990 or % correct). */
export function ScoreRing({
  value,
  max,
  label,
  caption,
  size = 148,
  tone = "blue",
  ariaLabel,
  className,
}: ScoreRingProps) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      className={cx(styles.ring, className)}
      data-tone={tone}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${label ?? value}${caption ? ` ${caption}` : ""}`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.track} cx="50" cy="50" r={radius} />
        <circle
          className={styles.value}
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className={styles.centre} aria-hidden="true">
        <strong>{label ?? value}</strong>
        {caption && <span>{caption}</span>}
      </div>
    </div>
  );
}
