import type { CSSProperties } from "react";

import { cx, type Tone } from "../types";
import styles from "./SegmentedProgress.module.css";

export interface ProgressSegment {
  value: number;
  tone: Tone;
}

export interface SegmentedProgressProps {
  /** Filled segments in order; the rest of `total` is the empty track. */
  segments: ProgressSegment[];
  total: number;
  size?: "xs" | "md";
  /** Accessible summary, e.g. "4 đã thuộc, 3 đang học, 3 mới". */
  label: string;
  className?: string;
}

export function SegmentedProgress({
  segments,
  total,
  size = "md",
  label,
  className,
}: SegmentedProgressProps) {
  const safeTotal = Math.max(total, 1);

  return (
    <div
      className={cx(styles.track, className)}
      data-size={size}
      role="img"
      aria-label={label}
      title={label}
    >
      {segments.map((segment, index) =>
        segment.value > 0 ? (
          <span
            key={index}
            className={styles.segment}
            data-tone={segment.tone}
            style={
              {
                "--segment-width": `${Math.min(100, (segment.value / safeTotal) * 100)}%`,
              } as CSSProperties
            }
          />
        ) : null,
      )}
    </div>
  );
}
