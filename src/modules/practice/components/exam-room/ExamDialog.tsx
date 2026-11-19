import { useEffect, useId, useRef, type ReactNode } from "react";

import { cx } from "@/shared/components/ui";

import styles from "./ExamRoom.module.css";

export interface ExamDialogProps {
  title: string;
  children?: ReactNode;
  /** Buttons; mark the safe one with `data-autofocus` (it gets the focus). */
  actions: ReactNode;
  /** Escape / backdrop click. null = the dialog cannot be dismissed (resume, expired). */
  onCancel: (() => void) | null;
  tone?: "default" | "danger";
}

/**
 * Exam room dialog (port of StudyChill ExamDialog) on the native <dialog>: focus trap and inert
 * background from the browser, focus on the safe action (`data-autofocus`), Escape = cancel and
 * never the main action. Mounted = open.
 */
export function ExamDialog({
  title,
  children,
  actions,
  onCancel,
  tone = "default",
}: ExamDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const before = document.activeElement as HTMLElement | null;
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    }
    const safe = dialog.querySelector<HTMLElement>("[data-autofocus]");
    (safe ?? dialog).focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, tone === "danger" && styles.dialogDanger)}
      aria-labelledby={titleId}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onCancel?.();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className={styles.dialogBody}>
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        {children && <div className={styles.dialogText}>{children}</div>}
        <div className={styles.dialogActions}>{actions}</div>
      </div>
    </dialog>
  );
}
