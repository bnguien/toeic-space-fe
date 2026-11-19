import type { CSSProperties } from "react";

import { cx } from "../types";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  shape?: "line" | "block" | "circle";
  className?: string;
}

const toLength = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : value;

export function Skeleton({ width, height, shape = "line", className }: SkeletonProps) {
  const style = {
    "--skeleton-w": toLength(width),
    "--skeleton-h": toLength(height),
  } as CSSProperties;

  return (
    <span
      className={cx(styles.skeleton, className)}
      data-shape={shape}
      style={style}
      aria-hidden="true"
    />
  );
}
