import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { IconButton } from "../Button/Button";
import { cx, type ButtonVariant, type ControlSize } from "../types";
import styles from "./Menu.module.css";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  /** Accessible name of the trigger. */
  label: string;
  items: MenuItem[];
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: ControlSize;
  align?: "start" | "end";
  className?: string;
}

/** Icon trigger with a small action list; closes on outside click, Escape or selection. */
export function Menu({
  label,
  items,
  icon,
  variant = "ghost",
  size = "sm",
  align = "end",
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <IconButton
        label={label}
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {icon ?? <MoreHorizontal size={18} />}
      </IconButton>
      {open && (
        <div id={listId} role="menu" className={styles.list} data-align={align}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={styles.item}
              data-tone={item.tone ?? "default"}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
