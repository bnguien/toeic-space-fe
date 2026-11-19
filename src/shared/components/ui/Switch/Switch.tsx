import type { ReactNode } from "react";

import { cx } from "../types";
import styles from "./Switch.module.css";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** On/off row: label on the left, track on the right. */
export function Switch({ checked, onChange, label, disabled = false, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cx(styles.switch, className)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
