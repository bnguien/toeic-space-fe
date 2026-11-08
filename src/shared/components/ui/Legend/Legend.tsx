import { cx, type Tone } from "../types";
import styles from "./Legend.module.css";

export interface LegendItem {
  label: string;
  value: number | string;
  tone: Tone;
}

export interface LegendProps {
  items: LegendItem[];
  inverted?: boolean;
  className?: string;
}

/** Dot legend: "Đã thuộc 12 · Đang học 4 · Chưa học 34". */
export function Legend({ items, inverted = false, className }: LegendProps) {
  return (
    <ul className={cx(styles.legend, className)} data-inverted={inverted || undefined}>
      {items.map((item) => (
        <li key={item.label} className={styles.item}>
          <span className={styles.dot} data-tone={item.tone} aria-hidden="true" />
          <span>{item.label}</span>
          <strong className={styles.value}>{item.value}</strong>
        </li>
      ))}
    </ul>
  );
}
