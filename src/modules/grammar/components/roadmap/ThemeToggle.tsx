import { Moon, Sun } from "lucide-react";

import { cx } from "../../utils/cx";
import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps {
  dark: boolean;
  onToggle: () => void;
  className?: string;
}

/** Sáng / Tối button (Studychill shows it in its navbar on this page). */
export function ThemeToggle({ dark, onToggle, className }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className={cx(styles.btn, className)}
      aria-label={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      title={dark ? "Chế độ sáng" : "Chế độ tối"}
      aria-pressed={dark}
      onClick={onToggle}
    >
      {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  );
}
