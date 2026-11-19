import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import helloMascot from "@/assets/mascot/oy2-hello.png";

import { authApi } from "../api/auth.api";
import styles from "../components/AuthScreen.module.css";
import { OtpInput } from "../components/OtpInput";
import { PasswordField } from "../components/PasswordField";
import { useCurrentUser } from "../hooks/useAuth";
import { changePasswordSchema, type ChangePasswordValues } from "../schemas/password.schema";
import { getPasswordErrorMessage } from "../utils/password-errors";
import { maskEmail } from "../utils/auth-helpers";
import { clearSessionAfterPasswordChange } from "../utils/session";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now);
  const request = useMutation({ mutationFn: authApi.requestChangePasswordOtp, gcTime: 0 });
  const change = useMutation({ mutationFn: authApi.changePassword, gcTime: 0 });
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onBlur",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pending = request.isPending || change.isPending;
  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const sendOtp = () => {
    if (pending || remaining > 0) return;
    setError(null);
    request.mutate(getValues("currentPassword"), {
      onSuccess: (response) => {
        setOtp("");
        setCooldownUntil(Date.now() + response.cooldownSeconds * 1000);
        setAwaitingOtp(true);
        request.reset();
      },
      onError: (failure) => {
        setError(getPasswordErrorMessage(failure));
        request.reset();
      },
    });
  };

  const onSubmit = handleSubmit((values) => {
    if (pending) return;
    if (!awaitingOtp) {
      if (remaining > 0) setAwaitingOtp(true);
      else sendOtp();
      return;
    }
    if (!/^[0-9]{6}$/.test(otp)) return;
    setError(null);
    change.mutate(
      { ...values, otp },
      {
        onSuccess: () => {
          reset();
          change.reset();
          clearSessionAfterPasswordChange();
          navigate("/login", { replace: true, state: { passwordChanged: true } });
        },
        onError: (failure) => {
          setOtp("");
          setError(getPasswordErrorMessage(failure));
          change.reset();
        },
      },
    );
  });

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="change-title">
        <header className={styles.header}>
          <img className={styles.mascot} src={helloMascot} alt="" width="112" height="112" />
          <span className={styles.eyebrow}>TOEIC SPACE · BẢO MẬT TÀI KHOẢN</span>
          <h1 id="change-title">{awaitingOtp ? "Xác minh đổi mật khẩu" : "Đổi mật khẩu"}</h1>
          {awaitingOtp ? (
            <p>
              Mã OTP được gửi đến email đã xác minh của tài khoản: {maskEmail(user?.email ?? "")}
            </p>
          ) : (
            <p>Mật khẩu mới cần 8–128 ký tự, ít nhất một chữ in hoa (A-Z) và một ký tự đặc biệt.</p>
          )}
        </header>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {error && (
            <p className={styles.alert} role="alert">
              {error}
            </p>
          )}
          {awaitingOtp ? (
            <>
              <p className={styles.alertInfo} role="status">
                Nhập mã OTP trong email để xác nhận đổi mật khẩu. Vui lòng kiểm tra cả thư rác.
              </p>
              <div className={styles.field}>
                <label htmlFor="change-otp">Mã OTP (6 chữ số)</label>
                <OtpInput
                  id="change-otp"
                  value={otp}
                  onChange={setOtp}
                  disabled={pending}
                  hasError={Boolean(error)}
                />
              </div>
            </>
          ) : (
            <>
              <PasswordField
                id="change-current"
                label="Mật khẩu hiện tại"
                autoComplete="current-password"
                registration={register("currentPassword")}
                error={errors.currentPassword?.message}
                disabled={pending}
              />
              <PasswordField
                id="change-new"
                label="Mật khẩu mới"
                registration={register("newPassword")}
                error={errors.newPassword?.message}
                disabled={pending}
              />
              <PasswordField
                id="change-confirm"
                label="Xác nhận mật khẩu mới"
                registration={register("confirmPassword")}
                error={errors.confirmPassword?.message}
                disabled={pending}
              />
            </>
          )}
          <p className={styles.note}>
            Sau khi đổi mật khẩu, vui lòng đăng nhập lại bằng mật khẩu mới.
          </p>
          <button
            type="submit"
            className={styles.submit}
            disabled={pending || (awaitingOtp && !/^[0-9]{6}$/.test(otp))}
          >
            {pending
              ? "Đang xử lý..."
              : awaitingOtp
                ? "Xác minh và đổi mật khẩu"
                : remaining > 0
                  ? "Tiếp tục xác minh OTP"
                  : "Gửi mã OTP"}
          </button>
        </form>
        {awaitingOtp && (
          <>
            <div className={styles.resendContainer}>
              <span className={styles.resendCountdown}>
                {remaining > 0 ? `Gửi lại sau ${remaining}s` : "Cần mã mới?"}
              </span>
              <button
                type="button"
                className={styles.resendBtn}
                disabled={pending || remaining > 0}
                onClick={sendOtp}
              >
                Gửi lại mã
              </button>
            </div>
            <button
              type="button"
              className={styles.resendBtn}
              disabled={pending}
              onClick={() => {
                setAwaitingOtp(false);
                setOtp("");
                setError(null);
              }}
            >
              Quay lại nhập mật khẩu
            </button>
          </>
        )}
        <footer className={styles.footerNav}>
          <Link to="/forgot-password" className={styles.footerLink}>
            Quên mật khẩu hiện tại?
          </Link>
          <p>
            <Link to="/" className={styles.footerLink}>
              Về trang chủ
            </Link>
          </p>
        </footer>
      </section>
    </main>
  );
}
