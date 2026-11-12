import type { ReactNode } from "react";

import { cx, type Tone } from "../types";
import styles from "./Badge.module.css";

export interface BadgeProps {
  tone?: Tone;
  size?: "sm" | "md";
  icon?: ReactNode;
  /** Clip long text with an ellipsis instead of growing. */
  truncate?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  size = "sm",
  icon,
  truncate = false,
  title,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cx(styles.badge, className)}
      data-tone={tone}
      data-size={size}
      data-truncate={truncate || undefined}
      title={title}
    >
      {icon}
      {children}
    </span>
  );
}
