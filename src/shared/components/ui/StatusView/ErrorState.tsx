import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "../Button/Button";
import { cx } from "../types";
import styles from "./StatusView.module.css";

export interface ErrorStateProps {
  image?: string;
  title: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra actions next to the retry button. */
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  image,
  title,
  onRetry,
  retryLabel = "Thử lại",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={cx(styles.view, className)} role="alert">
      {image && <img className={styles.image} src={image} alt="" />}
      <p className={styles.title}>{title}</p>
      {(onRetry || action) && (
        <div className={styles.actions}>
          {onRetry && (
            <Button variant="primary" icon={<RotateCcw size={16} />} onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
