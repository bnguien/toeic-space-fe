import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cx } from "../types";
import styles from "./Field.module.css";

export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  /** Short trailing label, e.g. a character count. */
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + error line. */
export function Field({ label, htmlFor, error, meta, className, children }: FieldProps) {
  return (
    <div className={cx(styles.field, className)} data-invalid={error ? true : undefined}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
        {meta && <span className={styles.meta}>{meta}</span>}
      </div>
      {children}
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  invalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { icon, invalid = false, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  return (
    <span className={cx(styles.control, className)} data-icon={icon ? true : undefined}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <input
        ref={ref}
        id={id ?? generatedId}
        className={styles.input}
        aria-invalid={invalid || undefined}
        {...props}
      />
    </span>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid = false, className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cx(styles.input, styles.textarea, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});
