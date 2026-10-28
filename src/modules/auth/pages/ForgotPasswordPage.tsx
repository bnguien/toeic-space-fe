import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import waitingMascot from "@/assets/mascot/oy2-waiting.png";

import { authApi } from "../api/auth.api";
import styles from "../components/AuthScreen.module.css";
import {
  passwordResetRequestSchema,
  type PasswordResetRequestValues,
} from "../schemas/password.schema";
import { getPasswordErrorMessage } from "../utils/password-errors";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const request = useMutation({ mutationFn: authApi.requestPasswordReset, gcTime: 0 });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });
  const onSubmit = handleSubmit((values) =>
    request.mutate(values, {
      onSuccess: (response) =>
        navigate("/reset-password", {
          state: {
            email: values.email,
            cooldownUntil: Date.now() + response.cooldownSeconds * 1000,
          },
        }),
    }),
  );

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="forgot-title">
        <header className={styles.header}>
          <img className={styles.mascot} src={waitingMascot} alt="" width="112" height="112" />
          <span className={styles.eyebrow}>TOEIC SPACE · KHÔI PHỤC TÀI KHOẢN</span>
          <h1 id="forgot-title">Quên mật khẩu?</h1>
          <p>Nhập email đã đăng ký để yêu cầu mã đặt lại mật khẩu.</p>
        </header>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {request.isError && (
            <p className={styles.alert} role="alert">
              {getPasswordErrorMessage(request.error)}
            </p>
          )}
          <div className={styles.field}>
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              disabled={request.isPending}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "forgot-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <small id="forgot-email-error" className={styles.fieldError}>
                {errors.email.message}
              </small>
            )}
          </div>
          <button type="submit" className={styles.submit} disabled={request.isPending}>
            {request.isPending ? "Đang gửi yêu cầu..." : "Gửi mã OTP"}
          </button>
        </form>
        <footer className={styles.footerNav}>
          <Link to="/login" className={styles.footerLink}>
            Quay lại đăng nhập
          </Link>
        </footer>
      </section>
    </main>
  );
}
