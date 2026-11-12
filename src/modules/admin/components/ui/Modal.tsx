import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button, IconButton } from "./Button";
import styles from "./ui.module.css";

/** Scroll lock is shared because several dialogs can be open at once (e.g. a confirm on top). */
let openModalCount = 0;
let previousHtmlOverflow = "";
let previousBodyOverflow = "";

interface ModalProps {
  open: boolean;
  title: string;
  wide?: boolean;
  description?: ReactNode;
  /** While true the modal cannot be dismissed, so a pending request is not orphaned. */
  busy?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}

/** Centered dialog built on the native <dialog> (focus trap, Escape, inert background). */
export function Modal({
  open,
  title,
  wide = false,
  description,
  busy = false,
  onClose,
  footer,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (openModalCount === 0) {
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    openModalCount += 1;
    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      data-wide={wide || undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onPointerDown={(event) => {
        // Only a press that starts on the backdrop itself counts. A drag that starts inside
        // the dialog (e.g. selecting text in an input) and ends on the backdrop must not
        // close the dialog.
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const fromBackdrop = backdropPress.current;
        backdropPress.current = false;
        if (fromBackdrop && event.target === event.currentTarget && !busy) onClose();
      }}
    >
      {open && (
        <div className={styles.modalBody}>
          <header className={styles.modalHeader}>
            <h2 id={titleId}>{title}</h2>
            <IconButton label="Đóng" onClick={onClose} disabled={busy}>
              <X size={18} />
            </IconButton>
          </header>
          {description && (
            <div id={descriptionId} className={styles.modalDescription}>
              {description}
            </div>
          )}
          {children}
          {footer && <footer className={styles.modalFooter}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  pending: boolean;
  /** Message of the last failed attempt, shown inside the dialog. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "default",
  pending,
  error,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      busy={pending}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Huỷ
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Đang xử lý..." : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
