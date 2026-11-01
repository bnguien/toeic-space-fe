import type { ReactNode } from "react";

import { cx } from "../types";
import styles from "./SelectionBar.module.css";

export interface SelectionBarProps {
  count: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  /** Bulk actions, primary last. */
  actions?: ReactNode;
  /** Stick to the bottom of the scroll area. */
  sticky?: boolean;
  className?: string;
}

/** "Đã chọn N · Chọn tất cả / Bỏ chọn" + bulk actions. */
export function SelectionBar({
  count,
  total,
  onSelectAll,
  onClear,
  actions,
  sticky = false,
  className,
}: SelectionBarProps) {
  return (
    <div
      className={cx(styles.bar, className)}
      data-sticky={sticky || undefined}
      role="region"
      aria-label="Lựa chọn"
    >
      <span className={styles.count} aria-live="polite">
        Đã chọn <strong>{count.toLocaleString("vi-VN")}</strong>
        <span className={styles.total}>/{total.toLocaleString("vi-VN")}</span>
      </span>
      <span className={styles.links}>
        <button
          type="button"
          className={styles.link}
          disabled={count === total}
          onClick={onSelectAll}
        >
          Chọn tất cả
        </button>
        <button type="button" className={styles.link} disabled={count === 0} onClick={onClear}>
          Bỏ chọn
        </button>
      </span>
      {actions && <span className={styles.actions}>{actions}</span>}
    </div>
  );
}
