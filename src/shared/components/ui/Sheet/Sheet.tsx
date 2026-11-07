import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "../Button/Button";
import styles from "./Sheet.module.css";

export interface SheetProps {
  open: boolean;
  title: string;
  /** Row under the title (e.g. tabs). */
  header?: ReactNode;
  /** Pinned to the bottom. */
  footer?: ReactNode;
  /** While true the sheet cannot be dismissed. */
  busy?: boolean;
  /** Keeps key presses inside the sheet (no page shortcuts fire while it is open). */
  containKeys?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  onClose: () => void;
  children?: ReactNode;
}

/** Right-side panel on the native <dialog> (focus trap, Escape, inert background). */
export function Sheet({
  open,
  title,
  header,
  footer,
  busy = false,
  containKeys = false,
  onKeyDown,
  onClose,
  children,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (containKeys) event.stopPropagation();
      }}
    >
      {open && (
        <div className={styles.frame}>
          <header className={styles.header}>
            <div className={styles.titleRow}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              <IconButton label="Đóng" onClick={onClose} disabled={busy}>
                <X size={18} />
              </IconButton>
            </div>
            {header}
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
