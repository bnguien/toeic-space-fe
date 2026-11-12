import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

import { cx, type ButtonVariant, type ControlSize } from "../types";
import styles from "./Button.module.css";

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ControlSize;
  /** Leading icon. */
  icon?: ReactNode;
  /** Trailing element, e.g. a Kbd chip or a count. */
  trailing?: ReactNode;
  /** Stretch to the container width. */
  block?: boolean;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    icon,
    trailing,
    block = false,
    className,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.button, className)}
      data-variant={variant}
      data-size={size}
      data-block={block || undefined}
      {...props}
    >
      {icon}
      {children !== undefined && <span className={styles.label}>{children}</span>}
      {trailing}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps, ButtonStyleProps {}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  icon,
  trailing,
  block = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(styles.button, className)}
      data-variant={variant}
      data-size={size}
      data-block={block || undefined}
      {...props}
    >
      {icon}
      {children !== undefined && <span className={styles.label}>{children}</span>}
      {trailing}
    </Link>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name and tooltip. */
  label: string;
  variant?: ButtonVariant;
  size?: ControlSize;
  round?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    variant = "ghost",
    size = "md",
    round = false,
    className,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.button, styles.icon, className)}
      data-variant={variant}
      data-size={size}
      data-round={round || undefined}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});

/**
 * Non-interactive button look for use inside a link or button (e.g. a tile that is itself the
 * click target). Carries no handlers and is hidden from assistive technology.
 */
export function ButtonGlyph({
  variant = "secondary",
  size = "md",
  round = false,
  className,
  children,
}: {
  variant?: ButtonVariant;
  size?: ControlSize;
  round?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(styles.button, round && styles.icon, className)}
      data-variant={variant}
      data-size={size}
      data-round={round || undefined}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
