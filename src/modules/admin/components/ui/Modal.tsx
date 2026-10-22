import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button, IconButton } from "./Button";
import styles from "./ui.module.css";

interface ModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** While true the modal cannot be dismissed, so a pending request is not orphaned. */
  busy?: boolean;
  onClose: () => void;
  footer: ReactNode;
  children?: ReactNode;
}

/** Centered dialog built on the native <dialog> (focus trap, Escape, inert background). */
export function Modal({
  open,
  title,
  description,
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
          <footer className={styles.modalFooter}>{footer}</footer>
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
