import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
  /** Render the list in a portal so scroll containers cannot clip it. */
  portal?: boolean;
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
  portal = false,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
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

  useLayoutEffect(() => {
    if (!open || !portal) return;
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = listRef.current?.offsetWidth ?? 180;
      const height = listRef.current?.offsetHeight ?? 0;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const left =
        align === "end"
          ? Math.max(8, Math.min(viewportWidth - width - 8, rect.right - width))
          : Math.max(8, Math.min(viewportWidth - width - 8, rect.left));
      const top =
        rect.bottom + height + 8 > viewportHeight && rect.top > height + 8
          ? rect.top - height - 4
          : rect.bottom + 4;
      setPosition((current) =>
        current?.left === left && current.top === top ? current : { left, top },
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, open, portal]);

  const portalStyle: CSSProperties | undefined = portal
    ? {
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
        zIndex: 1000,
      }
    : undefined;

  const list = (
    <div
      ref={listRef}
      id={listId}
      role="menu"
      className={styles.list}
      data-align={portal ? undefined : align}
      style={portalStyle}
    >
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
  );

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <IconButton
        ref={triggerRef}
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
      {open && (portal ? createPortal(list, document.body) : list)}
    </div>
  );
}
