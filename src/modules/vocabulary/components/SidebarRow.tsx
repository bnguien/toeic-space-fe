import type { CSSProperties, ReactNode } from "react";

import styles from "./SidebarRow.module.css";

interface SidebarRowProps {
  /** Number chip, dot or icon. */
  leading: ReactNode;
  label: ReactNode;
  /** Right-aligned small value (count, percent). */
  meta?: ReactNode;
  /** Control beside the row (e.g. a menu); kept outside the row button. */
  trailing?: ReactNode;
  /** 0..1 — thin bar along the bottom edge. */
  progress?: number;
  selected?: boolean;
  /** Remembered last choice: a tone mark, not a selection. */
  recent?: boolean;
  /** Tone variables (`stageToneStyle`). */
  style?: CSSProperties;
  title?: string;
  onClick: () => void;
}

/** Compact single-row sidebar item; selected = filled with the row's tone (navy by default). */
export function SidebarRow({
  leading,
  label,
  meta,
  trailing,
  progress,
  selected = false,
  recent = false,
  style,
  title,
  onClick,
}: SidebarRowProps) {
  return (
    <div
      className={styles.row}
      style={style}
      data-selected={selected || undefined}
      data-recent={(recent && !selected) || undefined}
      data-trailing={trailing ? true : undefined}
    >
      <button
        type="button"
        className={styles.button}
        aria-pressed={selected}
        title={title}
        onClick={onClick}
      >
        <span className={styles.leading}>{leading}</span>
        <span className={styles.label}>{label}</span>
        {meta !== undefined && <span className={styles.meta}>{meta}</span>}
        {progress !== undefined && (
          <span
            className={styles.bar}
            aria-hidden="true"
            style={{ "--row-progress": `${Math.round(progress * 100)}%` } as CSSProperties}
          />
        )}
      </button>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  );
}
