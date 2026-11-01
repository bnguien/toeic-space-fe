import type { ReactNode } from "react";

import { cx } from "../types";
import styles from "./Segmented.module.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  /** solid: navy active pill (learner); subtle: white active tab (admin lists). */
  variant?: "solid" | "subtle";
  className?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  variant = "solid",
  className,
}: SegmentedProps<T>) {
  return (
    <div
      className={cx(styles.group, className)}
      role="group"
      aria-label={label}
      data-size={size}
      data-variant={variant}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={styles.option}
            aria-pressed={active}
            data-active={active || undefined}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined && (
              <span className={styles.count}>{option.count.toLocaleString("vi-VN")}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
