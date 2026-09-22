import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import helloMascot from "@/assets/mascot/oy2-cheer.png";

import styles from "../components/AuthScreen.module.css";
import { useRegister } from "../hooks/useAuth";
import {
  PASSWORD_RULES,
  normalizePhoneNumber,
  registerSchema,
  type RegisterFormValues,
} from "../schemas/register.schema";
import { getRegisterErrorMessage, setVerificationSession } from "../utils/auth-helpers";

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    resetField,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const normalizedPhone = normalizePhoneNumber(values.phone);

    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: normalizedPhone ?? undefined,
      password: values.password,
      confirmPassword: values.confirmPassword,
    };

    registerMutation.mutate(payload, {
      onSuccess: (response) => {
        // Temporarily store email, challengeId, and userId for the verification step
        setVerificationSession({
          email: payload.email,
          challengeId: response.challengeId,
          userId: response.userId,
        });

        // Navigate to /verify-email with a notice that OTP was sent
        navigate("/verify-email", {
          state: {
            registered: true,
            email: payload.email,
          },
        });
      },
      onError: () => {
        // Clear passwords from form state on error
        resetField("password");
        resetField("confirmPassword");
        setPasswordValue("");
      },
    });
  });

  return (
    <main className={styles.screen}>
      <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="register-title">
        <header className={styles.header}>
          <img className={styles.mascot} src={helloMascot} alt="" width="112" height="112" />
          <span className={styles.eyebrow}>TOEIC SPACE · TẠO TÀI KHOẢN</span>
          <h1 id="register-title">Đăng ký thành viên</h1>
          <p>Bắt đầu hành trình chinh phục mục tiêu TOEIC của bạn.</p>
        </header>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {registerMutation.isError && (
            <p className={styles.alert} role="alert">
              {getRegisterErrorMessage(registerMutation.error)}
            </p>
          )}

          <div className={styles.field}>
            <label htmlFor="register-fullname">Họ và tên</label>
            <input
              id="register-fullname"
              type="text"
              autoComplete="name"
              maxLength={200}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "register-fullname-error" : undefined}
              {...register("fullName")}
            />
            {errors.fullName && (
              <small id="register-fullname-error" className={styles.fieldError}>
                {errors.fullName.message}
              </small>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "register-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <small id="register-email-error" className={styles.fieldError}>
                {errors.email.message}
              </small>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="register-phone">Số điện thoại (không bắt buộc)</label>
            <input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "register-phone-error" : undefined}
              {...register("phone")}
            />
            {errors.phone && (
              <small id="register-phone-error" className={styles.fieldError}>
                {errors.phone.message}
              </small>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="register-password">Mật khẩu</label>
            <div className={styles.passwordBox}>
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "register-password-error" : undefined}
                {...register("password", {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    setPasswordValue(e.target.value);
                  },
                  onBlur: () => {
                    if (getValues("confirmPassword")) {
                      void trigger("confirmPassword");
                    }
                  },
                })}
              />
              <button
                type="button"
                className={styles.reveal}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>

            <div
              className={styles.passwordRulesGrid}
              role="status"
              aria-label="Các yêu cầu mật khẩu"
            >
              {PASSWORD_RULES.map((rule) => {
                const isMet = rule.test(passwordValue);
                const isFailed = Boolean(errors.password) && !isMet;
                return (
                  <div
                    key={rule.id}
                    className={`${styles.passwordRuleItem} ${
                      isMet
                        ? styles.passwordRuleMet
                        : isFailed
                          ? styles.passwordRuleFailed
                          : styles.passwordRulePending
                    }`}
                  >
                    <span className={styles.ruleIcon}>
                      {isMet ? <CheckIcon /> : isFailed ? <CrossIcon /> : <DotIcon />}
                    </span>
                    <span>{rule.label}</span>
                  </div>
                );
              })}
            </div>

            {errors.password && (
              <small id="register-password-error" className={styles.fieldError}>
                {errors.password.message}
              </small>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="register-confirm-password">Xác nhận mật khẩu</label>
            <div className={styles.passwordBox}>
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "register-confirm-password-error" : undefined
                }
                {...register("confirmPassword")}
              />
              <button
                type="button"
                className={styles.reveal}
                aria-pressed={showConfirmPassword}
                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowConfirmPassword((visible) => !visible)}
              >
                {showConfirmPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {errors.confirmPassword && (
              <small id="register-confirm-password-error" className={styles.fieldError}>
                {errors.confirmPassword.message}
              </small>
            )}
          </div>

          <button type="submit" className={styles.submit} disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Đang đăng ký..." : "Đăng ký tài khoản"}
          </button>
        </form>

        <footer className={styles.footerNav}>
          <span>Đã có tài khoản? </span>
          <Link to="/login" className={styles.footerLink}>
            Đăng nhập ngay
          </Link>
        </footer>
      </section>
    </main>
  );
}
