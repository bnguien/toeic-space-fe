import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button, IconButton } from "../Button/Button";
import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  wide?: boolean;
  /** While true the modal cannot be dismissed, so a pending request is not orphaned. */
  busy?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}

/** Centred paper dialog on the native <dialog> (focus trap, Escape, inert background). */
export function Modal({
  open,
  title,
  description,
  wide = false,
  busy = false,
  onClose,
  footer,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
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
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      {open && (
        <div className={styles.body}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <IconButton label="Đóng" onClick={onClose} disabled={busy}>
              <X size={18} />
            </IconButton>
          </header>
          {description && (
            <div id={descriptionId} className={styles.description}>
              {description}
            </div>
          )}
          {children}
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  pending?: boolean;
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
  pending = false,
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
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Huỷ
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
