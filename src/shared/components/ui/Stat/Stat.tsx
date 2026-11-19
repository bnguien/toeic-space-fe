import type { ReactNode } from "react";

import { cx, type Tone } from "../types";
import styles from "./Stat.module.css";

export interface StatProps {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}

export function Stat({ value, label, icon, tone = "neutral", className }: StatProps) {
  return (
    <div className={cx(styles.stat, className)} data-tone={tone}>
      <span className={styles.label}>
        {icon}
        {label}
      </span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
