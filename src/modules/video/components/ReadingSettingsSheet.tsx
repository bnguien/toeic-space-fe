// "Cài đặt đọc" bottom sheet — only the shell (backdrop, sliding panel, title). The settings themselves live in
// ReadingSettingsBody, shared with the reader's tray on wide screens.
import { useEffect } from "react";

import { useSwipeDown } from "../hooks/useSwipeDown";
import { ReadingSettingsBody, type ReadingSettingsBodyProps } from "./ReadingSettingsBody";
import styles from "./ReadingSettingsSheet.module.css";

export interface ReadingSettingsSheetProps extends ReadingSettingsBodyProps {
  open: boolean;
  onClose: () => void;
  /** Dark reader theme: the sheet stays dark instead of flashing a light panel. */
  dark?: boolean;
}

export function ReadingSettingsSheet({
  open,
  value,
  onChange,
  onClose,
  saveWordsReady = false,
  dark = false,
  hiddenKeys = [],
}: ReadingSettingsSheetProps) {
  const { sheetRef, dragProps } = useSwipeDown<HTMLDivElement>(onClose);

  // Lock the page behind the open sheet.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Esc closes, like every sheet.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${dark ? styles.dark : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt đọc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.grab} {...dragProps}>
          <div className={styles.handle} />
          <div className={styles.head}>
            <h2 className={styles.title}>Cài đặt đọc</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
              ×
            </button>
          </div>
        </div>
        <div className={styles.scroll}>
          <ReadingSettingsBody
            value={value}
            onChange={onChange}
            saveWordsReady={saveWordsReady}
            hiddenKeys={hiddenKeys}
          />
        </div>
      </div>
    </div>
  );
}
