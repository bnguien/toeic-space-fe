import { X } from "lucide-react";

import { useToastStore } from "./toast-store";
import styles from "./Toast.module.css";

/** Renders queued toasts; mount once per page or layout. */
export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={styles.toast} data-tone={item.tone}>
          <span className={styles.title}>{item.title}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Đóng"
            onClick={() => dismiss(item.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
