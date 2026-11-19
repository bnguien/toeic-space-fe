import type { HTMLAttributes } from "react";

import { cx } from "../types";
import styles from "./ResizeHandle.module.css";

export interface ResizeHandleProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number;
  min: number;
  max: number;
  edge?: "left" | "right";
  dragging?: boolean;
}

/** Thin vertical drag handle (pointer + ←/→ keys) for `useResizable`. */
export function ResizeHandle({
  label,
  value,
  min,
  max,
  edge = "left",
  dragging = false,
  className,
  ...props
}: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={label}
      className={cx(styles.handle, className)}
      data-edge={edge}
      data-dragging={dragging || undefined}
      {...props}
    />
  );
}
