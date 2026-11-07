import type { MouseEvent, ReactNode } from "react";
import { X } from "lucide-react";

import { useSwipeDown } from "../hooks/useSwipeDown";
import type { GlossEntryDto } from "../types/video.types";
import styles from "./ReaderOverlays.module.css";

interface ReaderWordSheetProps {
  word: string;
  onClose: () => void;
  children: ReactNode;
}

/** Phone: the word card as a bottom sheet (landscape: a panel sliding from the right); swipe down closes. */
export function ReaderWordSheet({ word, onClose, children }: ReaderWordSheetProps) {
  const { sheetRef, dragProps } = useSwipeDown<HTMLElement>(onClose);
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} role="presentation" />
      <aside
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Thẻ từ: ${word}`}
      >
        <div className={styles.grab} {...dragProps}>
          <span className={styles.handle} />
        </div>
        <div className={styles.sheetBody}>{children}</div>
      </aside>
    </>
  );
}

export interface ReaderTip {
  word: string;
  x: number;
  y: number;
}

interface ReaderTooltipProps {
  tip: ReaderTip;
  gloss: Partial<GlossEntryDto> | null | undefined;
}

/** Mouse only: ONE tooltip positioned at the hovered word. */
export function ReaderTooltip({ tip, gloss }: ReaderTooltipProps) {
  return (
    <div className={styles.tip} style={{ left: `${tip.x}px`, top: `${tip.y}px` }}>
      {gloss && gloss.meaning && <span className={styles.tipMeaning}>{gloss.meaning}</span>}
      {gloss && !gloss.meaning && gloss.definition && (
        <span className={styles.tipDefinition}>{gloss.definition}</span>
      )}
      {gloss && !gloss.meaning && !gloss.definition && (
        <span className={styles.tipDim}>chưa có nghĩa — bấm để tra</span>
      )}
      {!gloss && <span className={styles.tipDim}>đang tra…</span>}
    </div>
  );
}

interface ReaderSettingsDrawerProps {
  onClose: () => void;
  children: ReactNode;
}

/** Desktop: "Cài đặt đọc" drawer from the right edge (inside the reader root so it follows the palette). */
export function ReaderSettingsDrawer({ onClose, children }: ReaderSettingsDrawerProps) {
  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <div className={styles.drawerWrap} onMouseDown={onBackdrop}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt đọc"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header className={styles.drawerHead}>
          <h2>Cài đặt đọc</h2>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Đóng cài đặt"
            autoFocus
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.drawerBody}>{children}</div>
      </aside>
    </div>
  );
}
