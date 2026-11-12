import { useState, type FormEvent } from "react";

import type { UserRole } from "@/modules/auth";
import { Select } from "@/shared/components/Select";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/shared/utils/phone";
import { ROLE_LABELS, userErrorMessage } from "../../utils/userManagement";
import { Button, Modal } from "../ui";
import uiStyles from "../ui/ui.module.css";
import styles from "./users.module.css";

export interface UserFormValues {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
}

interface UserFormDialogProps {
  mode: "create" | "edit";
  initial: UserFormValues;
  pending: boolean;
  error: unknown;
  onSubmit: (values: {
    fullName: string;
    email: string;
    phone: string | null;
    role: UserRole;
  }) => void;
  onClose: () => void;
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors the server rules so most mistakes are caught before the request. */
function validate(values: UserFormValues, mode: "create" | "edit") {
  const errors: Partial<Record<keyof UserFormValues, string>> = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();

  if (!fullName) errors.fullName = "Vui lòng nhập họ và tên.";
  else if (fullName.length > 200) errors.fullName = "Tối đa 200 ký tự.";

  if (mode === "create") {
    if (!email) errors.email = "Vui lòng nhập email.";
    else if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = "Email không hợp lệ.";
  }

  if (!isValidPhoneNumber(values.phone)) {
    errors.phone = "Số di động Việt Nam không hợp lệ, ví dụ 0912 345 678.";
  }

  return errors;
}

/**
 * Create and edit share one form. Email and role are only set on creation: the email is the
 * sign-in identifier and the role has its own confirmed action.
 */
export function UserFormDialog({
  mode,
  initial,
  pending,
  error,
  onSubmit,
  onClose,
}: UserFormDialogProps) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState(false);
  const errors = validate(values, mode);
  const visibleErrors = touched ? errors : {};
  const formId = `user-form-${mode}`;

  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0) return;

    onSubmit({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: normalizePhoneNumber(values.phone),
      role: values.role,
    });
  };

  return (
    <Modal
      open
      title={mode === "create" ? "Tạo tài khoản" : "Sửa thông tin"}
      description={mode === "create" ? "Tài khoản dùng được ngay với mật khẩu tạm." : undefined}
      busy={pending}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Huỷ
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={pending}>
            {pending ? "Đang lưu..." : mode === "create" ? "Tạo tài khoản" : "Lưu"}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <label className={styles.field}>
          <span>Họ và tên</span>
          <input
            value={values.fullName}
            onChange={(event) => set("fullName", event.target.value)}
            maxLength={200}
            autoComplete="off"
            aria-invalid={Boolean(visibleErrors.fullName)}
            autoFocus
          />
          {visibleErrors.fullName && <small>{visibleErrors.fullName}</small>}
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            disabled={mode === "edit"}
            maxLength={254}
            autoComplete="off"
            aria-invalid={Boolean(visibleErrors.email)}
          />
          {mode === "edit" && <small className={styles.hint}>Email là tên đăng nhập.</small>}
          {visibleErrors.email && <small>{visibleErrors.email}</small>}
        </label>

        <label className={styles.field}>
          <span>
            Số điện thoại <em>(không bắt buộc)</em>
          </span>
          <input
            type="tel"
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
            placeholder="0912 345 678"
            autoComplete="off"
            aria-invalid={Boolean(visibleErrors.phone)}
          />
          {visibleErrors.phone && <small>{visibleErrors.phone}</small>}
        </label>

        {mode === "create" && (
          <div className={styles.field}>
            <span>Vai trò</span>
            <Select
              aria-label="Vai trò"
              value={values.role}
              options={ROLE_OPTIONS}
              onChange={(role) => set("role", role as UserRole)}
            />
          </div>
        )}

        {Boolean(error) && (
          <p className={uiStyles.formError} role="alert">
            {userErrorMessage(error)}
          </p>
        )}
      </form>
    </Modal>
  );
}
