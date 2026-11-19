import type { ReactNode } from "react";

import { cx } from "../../utils/cx";
import styles from "./Collapse.module.css";

interface CollapseProps {
  open: boolean;
  children: ReactNode;
}

/** Animated drop-down (grid-template-rows 0fr → 1fr); `inert` while closed so it cannot be tabbed into. */
export function Collapse({ open, children }: CollapseProps) {
  return (
    <div className={cx(styles.collapse, open && styles.open)} inert={!open}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
