import type { ReactNode } from "react";

import { cx } from "@/shared/components/ui";

import styles from "./StudyFrame.module.css";

interface StudyFrameProps {
  /** Vertical action rail right of the frame (on phones it floats over the card's top edge). */
  rail?: ReactNode;
  /** Controls under the card (flip / grades / input); `--footer-w` caps them in landscape. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The study area inside `StudyStage`: card on top, controls below, rail on the right. Its size
 * follows the stage layout (9:16 or 16:9) and animates when the layout changes.
 */
export function StudyFrame({ rail, footer, className, children }: StudyFrameProps) {
  return (
    <div className={cx(styles.frame, className)}>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
      {rail && <div className={styles.rail}>{rail}</div>}
    </div>
  );
}
