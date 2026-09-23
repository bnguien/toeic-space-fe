import { useCallback, useEffect, useRef } from "react";

import styles from "./AuthScreen.module.css";

interface OtpInputProps {
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  autoFocus?: boolean;
  ariaDescribedBy?: string;
  "aria-describedby"?: string;
}

const OTP_LENGTH = 6;

function formatDigits(digits: string[]): string {
  let lastFilledIndex = -1;
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] && digits[i].trim()) {
      lastFilledIndex = i;
      break;
    }
  }
  if (lastFilledIndex === -1) {
    return "";
  }
  return digits
    .slice(0, lastFilledIndex + 1)
    .map((d) => (d && d.trim() ? d : " "))
    .join("");
}

export function OtpInput({
  value = "",
  onChange,
  disabled = false,
  hasError = false,
  id = "otp-input",
  autoFocus = true,
  ariaDescribedBy,
  "aria-describedby": ariaDescribedByProp,
}: OtpInputProps) {
  const describedBy = ariaDescribedBy || ariaDescribedByProp;
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Keep array of length OTP_LENGTH, mapping spaces (unfilled slots) to empty strings
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => {
    const char = value[i];
    return char && char !== " " ? char : "";
  });

  useEffect(() => {
    if (autoFocus && !disabled && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleInputChange = useCallback(
    (index: number, char: string) => {
      // Only accept digits
      const cleaned = char.replace(/\D/g, "");
      if (!cleaned) {
        const nextDigits = [...digits];
        nextDigits[index] = "";
        onChange(formatDigits(nextDigits));
        return;
      }

      const nextDigits = [...digits];

      if (cleaned.length > 1) {
        // Multi-digit paste or autofill in a single field
        const chars = cleaned.slice(0, OTP_LENGTH).split("");
        chars.forEach((c, idx) => {
          nextDigits[idx] = c;
        });
        const combined = formatDigits(nextDigits);
        onChange(combined);
        const nextFocusIndex = Math.min(chars.length, OTP_LENGTH - 1);
        inputsRef.current[nextFocusIndex]?.focus();
        return;
      }

      // Single digit typed
      nextDigits[index] = cleaned[0];
      const combined = formatDigits(nextDigits);
      onChange(combined);

      if (index < OTP_LENGTH - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [digits, onChange],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (!digits[index] && index > 0) {
          e.preventDefault();
          const nextDigits = [...digits];
          nextDigits[index - 1] = "";
          onChange(formatDigits(nextDigits));
          inputsRef.current[index - 1]?.focus();
        } else if (digits[index]) {
          e.preventDefault();
          const nextDigits = [...digits];
          nextDigits[index] = "";
          onChange(formatDigits(nextDigits));
        }
      } else if (e.key === "Delete") {
        if (digits[index]) {
          e.preventDefault();
          const nextDigits = [...digits];
          nextDigits[index] = "";
          onChange(formatDigits(nextDigits));
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        inputsRef.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        e.preventDefault();
        inputsRef.current[index + 1]?.focus();
      }
    },
    [digits, onChange],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
      if (!pastedData) {
        return;
      }

      const pastedChars = pastedData.slice(0, OTP_LENGTH).split("");
      const nextDigits = Array.from({ length: OTP_LENGTH }, (_, i) => pastedChars[i] || "");
      const combined = formatDigits(nextDigits);
      onChange(combined);

      const focusIdx = Math.min(pastedChars.length, OTP_LENGTH - 1);
      inputsRef.current[focusIdx]?.focus();
    },
    [onChange],
  );

  return (
    <div
      className={styles.otpGrid}
      role="group"
      aria-label="Nhập mã xác thực 6 chữ số"
      aria-describedby={describedBy}
    >
      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digits[index] || ""}
          disabled={disabled}
          aria-label={`Chữ số ${index + 1}`}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={`${styles.otpCell} ${digits[index] ? styles.otpCellFilled : ""}`}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
