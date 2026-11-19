import type { ReactNode } from "react";

import { cx } from "../types";
import styles from "./StatusView.module.css";

export interface EmptyStateProps {
  /** Mascot or illustration URL; decorative. */
  image?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ image, title, action, className }: EmptyStateProps) {
  return (
    <div className={cx(styles.view, className)} role="status">
      {image && <img className={styles.image} src={image} alt="" />}
      <p className={styles.title}>{title}</p>
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}
