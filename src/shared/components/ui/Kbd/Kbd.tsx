import type { ReactNode } from "react";

import { cx } from "../types";
import styles from "./Kbd.module.css";

export interface KbdProps {
  /** Rendered on light text over a filled button. */
  inverted?: boolean;
  className?: string;
  children: ReactNode;
}

/** Keyboard shortcut chip; hidden on touch-only devices. */
export function Kbd({ inverted = false, className, children }: KbdProps) {
  return (
    <kbd className={cx(styles.kbd, className)} data-inverted={inverted || undefined}>
      {children}
    </kbd>
  );
}
