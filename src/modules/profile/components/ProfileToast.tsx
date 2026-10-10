import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import styles from "./ProfileToast.module.css";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  title?: string;
  message: string;
}

interface ProfileToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ProfileToast({ toasts, onDismiss }: ProfileToastProps) {
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      const first = toasts[0];
      if (first) {
        onDismiss(first.id);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const typeClass =
          toast.type === "success"
            ? styles.toastSuccess
            : toast.type === "error"
              ? styles.toastError
              : styles.toastInfo;

        return (
          <div key={toast.id} className={`${styles.toast} ${typeClass}`} role="alert">
            <span className={styles.iconWrap}>
              {toast.type === "success" && <CheckCircle2 size={18} />}
              {toast.type === "error" && <AlertCircle size={18} />}
              {toast.type === "info" && <Info size={18} />}
            </span>

            <div className={styles.content}>
              {toast.title && <div className={styles.title}>{toast.title}</div>}
              <div className={styles.message}>{toast.message}</div>
            </div>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => onDismiss(toast.id)}
              aria-label="Đóng thông báo"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
