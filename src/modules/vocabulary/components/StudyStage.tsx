import { forwardRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton, ProgressBar, cx, type IconButtonProps } from "@/shared/components/ui";

import type { StudyLayout } from "../types/vocabulary.types";
import styles from "./StudyStage.module.css";

interface StudyStageProps {
  /** Full-viewport layer (video or ambient). */
  backdrop?: ReactNode;
  /** Decoration above the backdrop, below the content (e.g. snowfall). */
  overlay?: ReactNode;
  /** Answered cards. */
  done: number;
  total: number;
  /** "n/total" */
  count: string;
  finished?: boolean;
  onClose: () => void;
  /** Top-bar tools on the right (settings, snow, restart). */
  actions?: ReactNode;
  /**
   * Frame shape. Exposed as `data-study-layout` so the frame and every card can adapt in CSS
   * (`[data-study-layout="landscape"] …`).
   */
  layout?: StudyLayout;
  /** Centered content, usually a `StudyFrame`. */
  children: ReactNode;
}

/**
 * Immersive study shell shared by every mode: backdrop behind everything, a slim top bar
 * (close · progress · n/total · tools) and a centered stage, portrait (9:16) or landscape (16:9).
 */
export function StudyStage({
  backdrop,
  overlay,
  done,
  total,
  count,
  finished = false,
  onClose,
  actions,
  layout = "portrait",
  children,
}: StudyStageProps) {
  return (
    <div className={styles.stage} data-study-layout={layout}>
      {backdrop}
      {overlay && <div className={styles.overlay}>{overlay}</div>}
      <header className={styles.bar}>
        <div className={styles.start}>
          <StudyToolButton label="Thoát" onClick={onClose}>
            <X size={20} />
          </StudyToolButton>
        </div>
        <div className={styles.progress}>
          <ProgressBar
            className={styles.track}
            value={done}
            max={Math.max(total, 1)}
            tone={finished ? "green" : "blue"}
            label="Tiến độ"
          />
          <span className={styles.count}>{count}</span>
        </div>
        <div className={styles.end}>{actions}</div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

/** Round top-bar / rail tool that stays readable on any backdrop. */
export const StudyToolButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function StudyToolButton({ className, ...props }, ref) {
    return <IconButton ref={ref} round className={cx(styles.tool, className)} {...props} />;
  },
);
