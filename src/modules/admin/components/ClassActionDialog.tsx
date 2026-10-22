import { X } from "lucide-react";
import styles from "../pages/ClassesPage.module.css";

export interface ClassActionConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
}

export function ClassActionDialog({
  confirmation,
  onClose,
  pending,
  onConfirm,
}: {
  confirmation: ClassActionConfirmation;
  onClose: () => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={() => {
        if (!pending) onClose();
      }}
    >
      <div
        className={styles.actionDialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="class-action-title"
        aria-describedby="class-action-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="class-action-title">{confirmation.title}</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            disabled={pending}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <p id="class-action-description">{confirmation.message}</p>
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={pending}
          >
            Hủy
          </button>
          <button
            type="button"
            className={styles.archiveButton}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Đang xử lý..." : confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
