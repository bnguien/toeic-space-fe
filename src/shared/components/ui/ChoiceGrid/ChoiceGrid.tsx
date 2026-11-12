import type { CSSProperties, ReactNode } from "react";

import { cx } from "../types";
import styles from "./ChoiceGrid.module.css";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Leading glyph, e.g. a colour swatch or a play icon. */
  icon?: ReactNode;
}

export interface ChoiceGridProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  value: T;
  /** Also fires when the active option is picked again (e.g. to replay a preview). */
  onChange: (value: T) => void;
  label: string;
  /** Column count; keep labels short enough for phones. */
  columns?: number;
  /** row: icon beside the label; stack: icon (e.g. a swatch) above it. */
  layout?: "row" | "stack";
  disabled?: boolean;
  className?: string;
}

/** Single choice among outlined tiles that wrap into a grid. */
export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  label,
  columns = 2,
  layout = "row",
  disabled = false,
  className,
}: ChoiceGridProps<T>) {
  return (
    <div
      className={cx(styles.grid, className)}
      role="radiogroup"
      aria-label={label}
      data-layout={layout}
      style={{ "--choice-columns": columns } as CSSProperties}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            className={styles.option}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <span className={styles.icon}>{option.icon}</span>}
            <span className={styles.label}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
