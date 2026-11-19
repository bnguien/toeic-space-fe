import { useRef, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Scale } from "lucide-react";

import { cx } from "@/shared/components/ui";

import { useSplitRatio } from "../../hooks/useSplitRatio";
import styles from "./SplitPane.module.css";

export interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  /** Name of the left side, used by "Mở lại …" and the accessible labels. */
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

/**
 * Two resizable columns (port of the StudyChill workspace divider): drag 20–80 % with a snap to
 * 50 and a "x% : y%" badge, ‹ ⚖ › buttons (50→35→0 / 50 / 50→65→100), double-click resets,
 * ratio persisted. A fully collapsed side shows a "Mở lại …" tab. Below 1024px the columns
 * stack and the divider is hidden (pages switch to their mobile layout there).
 */
export function SplitPane({
  left,
  right,
  leftLabel = "Đề bài",
  rightLabel = "Câu hỏi",
  className,
}: SplitPaneProps) {
  const container = useRef<HTMLDivElement>(null);
  const split = useSplitRatio(container);
  const style = { "--split": `${split.ratio}%` } as CSSProperties;

  return (
    <div
      ref={container}
      className={cx(styles.split, className)}
      style={style}
      data-dragging={split.dragging || undefined}
      data-left-collapsed={split.leftCollapsed || undefined}
      data-right-collapsed={split.rightCollapsed || undefined}
    >
      <section
        className={styles.left}
        aria-label={leftLabel}
        data-collapsed={split.leftCollapsed || undefined}
      >
        {left}
      </section>
      <div className={styles.divider}>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Kéo để đổi độ rộng ${leftLabel} / ${rightLabel}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split.ratio)}
          tabIndex={0}
          className={styles.handle}
          title="Kéo để đổi độ rộng · nhấp đúp để chia đôi"
          {...split.handleProps}
        />
        <div className={styles.controls}>
          <button
            type="button"
            onClick={split.stepLeft}
            disabled={split.leftCollapsed}
            aria-label={`Thu hẹp ${leftLabel}`}
            title={`Thu hẹp ${leftLabel}`}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={split.reset} aria-label="Chia đôi" title="Chia đôi">
            <Scale size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={split.stepRight}
            disabled={split.rightCollapsed}
            aria-label={`Mở rộng ${leftLabel}`}
            title={`Mở rộng ${leftLabel}`}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
        {split.badge && (
          <span className={styles.badge} aria-live="polite">
            {split.badge}
          </span>
        )}
      </div>
      <section
        className={styles.right}
        aria-label={rightLabel}
        data-collapsed={split.rightCollapsed || undefined}
      >
        {right}
      </section>
      {split.leftCollapsed && (
        <button type="button" className={styles.reopen} data-side="left" onClick={split.reset}>
          Mở lại {leftLabel}
        </button>
      )}
      {split.rightCollapsed && (
        <button type="button" className={styles.reopen} data-side="right" onClick={split.reset}>
          Mở lại {rightLabel}
        </button>
      )}
    </div>
  );
}
