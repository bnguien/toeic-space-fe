import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import styles from "./AuthScreen.module.css";

interface PasswordFieldProps {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  autoComplete?: "current-password" | "new-password";
}

export function PasswordField({
  id,
  label,
  registration,
  error,
  disabled,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordBox}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          maxLength={128}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...registration}
        />
        <button
          type="button"
          className={styles.reveal}
          disabled={disabled}
          aria-pressed={visible}
          aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </div>
      {error && (
        <small id={`${id}-error`} className={styles.fieldError}>
          {error}
        </small>
      )}
    </div>
  );
}
