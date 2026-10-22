import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "./Button";
import styles from "./ui.module.css";

interface DrawerProps {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Shown before the title, e.g. an avatar. */
  leading?: ReactNode;
  /** Badges under the title. */
  meta?: ReactNode;
  size?: "md" | "lg";
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Detail panel that slides in from the right over the list, so the list keeps its scroll,
 * filters and page. Built on the native <dialog> for focus handling and Escape.
 */
export function Drawer({
  open,
  title,
  subtitle,
  leading,
  meta,
  size = "md",
  onClose,
  footer,
  children,
}: DrawerProps) {
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
      className={styles.drawer}
      data-size={size}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <>
          <header className={styles.drawerHeader}>
            {leading}
            <div className={styles.drawerTitle}>
              <h2 id={titleId}>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
              {meta && <div className={styles.drawerMeta}>{meta}</div>}
            </div>
            <IconButton label="Đóng" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </header>
          <div className={styles.drawerBody}>{children}</div>
          {footer && <footer className={styles.drawerFooter}>{footer}</footer>}
        </>
      )}
    </dialog>
  );
}

export function DrawerSection({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.drawerSection}>
      <h3>
        {emoji && <span aria-hidden="true">{emoji}</span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Label / value rows; long values (`wide`) go under their label. */
export function Facts({ items }: { items: { label: string; value: ReactNode; wide?: boolean }[] }) {
  return (
    <dl className={styles.facts}>
      {items.map((item) => (
        <div key={item.label} data-wide={item.wide ? "true" : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The two or three figures a reader looks for first, as tiles at the top of a drawer. */
export function Highlights({
  items,
}: {
  items: { label: string; value: ReactNode; accent?: boolean }[];
}) {
  return (
    <div className={styles.highlights}>
      {items.map((item) => (
        <div key={item.label} data-accent={item.accent ? "true" : undefined}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
