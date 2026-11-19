import type { ReactNode } from "react";

import { cx } from "../types";
import styles from "./Eyebrow.module.css";

export interface EyebrowProps {
  /** Short vertical bar at the left. */
  accent?: boolean;
  /** Light text on a dark background. */
  inverted?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Small-caps, letter-spaced label above a heading. */
export function Eyebrow({
  accent = false,
  inverted = false,
  icon,
  className,
  children,
}: EyebrowProps) {
  return (
    <span
      className={cx(styles.eyebrow, className)}
      data-accent={accent || undefined}
      data-inverted={inverted || undefined}
    >
      {icon}
      {children}
    </span>
  );
}
