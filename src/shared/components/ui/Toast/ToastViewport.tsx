import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { useToastStore, type ToastItem } from "./toast-store";
import styles from "./Toast.module.css";

function ToastToneIcon({ tone }: { tone: ToastItem["tone"] }) {
  if (tone === "green") {
    return <CheckCircle2 className={styles.icon} size={20} />;
  }
  if (tone === "rose") {
    return <AlertCircle className={styles.icon} size={20} />;
  }
  return <Info className={styles.icon} size={20} />;
}

/** Renders queued toasts on the right side of the screen; mount once per page or layout. */
export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);

  if (items.length === 0) return null;

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={styles.toast} data-tone={item.tone}>
          <ToastToneIcon tone={item.tone} />
          <span className={styles.title}>{item.title}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Đóng"
            onClick={() => dismiss(item.id)}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Reusable Toast component alias for ToastViewport */
export const Toast = ToastViewport;
