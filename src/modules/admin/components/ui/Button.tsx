import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

import styles from "./ui.module.css";

export type ButtonVariant = "default" | "primary" | "danger" | "danger-outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", icon, children, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${styles.button} ${className ?? ""}`}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = "default",
  size = "md",
  icon,
  children,
  ...props
}: LinkProps & { variant?: ButtonVariant; size?: "md" | "sm"; icon?: ReactNode }) {
  return (
    <Link className={styles.button} data-variant={variant} data-size={size} {...props}>
      {icon}
      {children}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

/** Icon-only button; the label is both the accessible name and the tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={styles.iconButton}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});
