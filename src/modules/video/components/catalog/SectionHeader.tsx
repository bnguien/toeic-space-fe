import type { ReactNode } from "react";

import styles from "./SectionHeader.module.css";

export interface SectionHeaderProps {
  /** `card` = desktop section card (icon circle + title + badge); `plain` = mobile heading row. */
  variant: "card" | "plain";
  /** Lucide icon, shown in the card variant only. */
  icon?: ReactNode;
  title: string;
  count: number;
  /** Right-hand actions: search, "Xem tất cả", pagination. */
  children?: ReactNode;
}

/** Header row of "Video của tôi" / "Video tham khảo". */
export function SectionHeader({ variant, icon, title, count, children }: SectionHeaderProps) {
  if (variant === "plain") {
    return (
      <div className={styles.plainHeader}>
        <div className={styles.plainTitleGroup}>
          <h2 className={styles.plainTitle}>{title}</h2>
          <span className={styles.plainCount}>{count}</span>
        </div>
        <div className={styles.actions}>{children}</div>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <div className={styles.titleGroup}>
        <div className={styles.iconCircle}>{icon}</div>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>{count}</span>
      </div>
      <div className={styles.actions}>{children}</div>
    </div>
  );
}
