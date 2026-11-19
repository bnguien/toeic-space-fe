import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import waitingMascot from "@/assets/mascot/oy2-waiting.png";

import { authApi } from "../api/auth.api";
import styles from "../components/AuthScreen.module.css";
import { OtpInput } from "../components/OtpInput";
import { PasswordField } from "../components/PasswordField";
import { newPasswordSchema, type NewPasswordValues } from "../schemas/password.schema";
import { maskEmail } from "../utils/auth-helpers";
import { getPasswordErrorMessage } from "../utils/password-errors";
import { clearSessionAfterPasswordChange } from "../utils/session";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const flow = location.state as {
    email?: unknown;
    cooldownUntil?: unknown;
    expiresAt?: unknown;
  } | null;
  const email = typeof flow?.email === "string" ? flow.email : "";
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(
    typeof flow?.expiresAt === "number" && Number.isFinite(flow.expiresAt) ? flow.expiresAt : null,
  );
  const [cooldownUntil, setCooldownUntil] = useState(
    typeof flow?.cooldownUntil === "number" ? flow.cooldownUntil : 0,
  );
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(
    "Nếu tài khoản đủ điều kiện, mã OTP sẽ được gửi đến email của bạn. Vui lòng kiểm tra cả thư rác.",
  );
  const request = useMutation({ mutationFn: authApi.requestPasswordReset, gcTime: 0 });
  const verify = useMutation({ mutationFn: authApi.verifyPasswordReset, gcTime: 0 });
  const confirm = useMutation({ mutationFn: authApi.confirmPasswordReset, gcTime: 0 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    mode: "onBlur",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pending = request.isPending || verify.isPending || confirm.isPending;
  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const expired = expiresAt !== null && now >= expiresAt;

  const onConfirm = handleSubmit((values) => {
    if (pending || expiresAt === null || now >= expiresAt) return;
    setError(null);
    confirm.mutate(values, {
      onSuccess: () => {
        reset();
        confirm.reset();
        clearSessionAfterPasswordChange();
        navigate("/login", { replace: true, state: { passwordChanged: true } });
      },
      onError: (failure) => {
        reset();
        setError(getPasswordErrorMessage(failure));
        confirm.reset();
      },
    });
  });

  const resend = () => {
    if (pending || remaining > 0) return;
    setError(null);
    request.mutate(
      { email },
      {
        onSuccess: (response) => {
          setOtp("");
          reset();
          setExpiresAt(null);
          const nextCooldown = Date.now() + response.cooldownSeconds * 1000;
          setCooldownUntil(nextCooldown);
          navigate("/reset-password", {
            replace: true,
            state: { email, cooldownUntil: nextCooldown },
          });
          setNotice("Nếu tài khoản đủ điều kiện, mã OTP mới sẽ được gửi. Hãy sử dụng mã mới nhất.");
        },
        onError: (failure) => setError(getPasswordErrorMessage(failure)),
      },
    );
  };

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="reset-title">
        <header className={styles.header}>
          <img className={styles.mascot} src={waitingMascot} alt="" width="112" height="112" />
          <span className={styles.eyebrow}>TOEIC SPACE · ĐẶT LẠI MẬT KHẨU</span>
          <h1 id="reset-title">{expiresAt === null ? "Xác minh mã OTP" : "Tạo mật khẩu mới"}</h1>
          {email && <p className={styles.emailHighlight}>{maskEmail(email)}</p>}
        </header>
        {!email ? (
          <p className={styles.alertInfo} role="status">
            Vui lòng yêu cầu mã OTP trước khi đặt lại mật khẩu.
          </p>
        ) : (
          <div className={styles.form}>
            {error && (
              <p className={styles.alert} role="alert">
                {error}
              </p>
            )}
            {expired && (
              <p className={styles.alert} role="alert">
                Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã mới.
              </p>
            )}
            {expiresAt === null ? (
              <form
                className={styles.form}
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (pending) return;
                  if (!/^[0-9]{6}$/.test(otp)) {
                    setError("Vui lòng nhập đủ 6 chữ số OTP.");
                    return;
                  }
                  setError(null);
                  verify.mutate(
                    { email, otp },
                    {
                      onSuccess: (response) => {
                        setOtp("");
                        const expiry = Date.parse(response.expiresAt);
                        setExpiresAt(expiry);
                        navigate("/reset-password", {
                          replace: true,
                          state: { email, cooldownUntil, expiresAt: expiry },
                        });
                        verify.reset();
                      },
                      onError: (failure) => {
                        setOtp("");
                        setError(getPasswordErrorMessage(failure));
                        verify.reset();
                      },
                    },
                  );
                }}
              >
                <p className={styles.alertInfo} role="status">
                  {notice}
                </p>
                <div className={styles.field}>
                  <label htmlFor="reset-otp">Mã OTP (6 chữ số)</label>
                  <OtpInput
                    id="reset-otp"
                    value={otp}
                    onChange={setOtp}
                    disabled={pending}
                    hasError={Boolean(error)}
                  />
                </div>
                <button
                  type="submit"
                  className={styles.submit}
                  disabled={pending || !/^[0-9]{6}$/.test(otp)}
                >
                  {verify.isPending ? "Đang xác minh..." : "Xác minh OTP"}
                </button>
              </form>
            ) : (
              !expired && (
                <form className={styles.form} onSubmit={onConfirm} noValidate>
                  <p className={styles.alertInfo} role="status">
                    Xác minh thành công. Mật khẩu cần 8–128 ký tự, ít nhất một chữ in hoa (A-Z) và
                    một ký tự đặc biệt.
                  </p>
                  <PasswordField
                    id="reset-password"
                    label="Mật khẩu mới"
                    registration={register("newPassword")}
                    error={errors.newPassword?.message}
                    disabled={pending}
                  />
                  <PasswordField
                    id="reset-confirm"
                    label="Xác nhận mật khẩu mới"
                    registration={register("confirmPassword")}
                    error={errors.confirmPassword?.message}
                    disabled={pending}
                  />
                  <button type="submit" className={styles.submit} disabled={pending}>
                    {confirm.isPending ? "Đang đặt lại mật khẩu..." : "Đặt lại mật khẩu"}
                  </button>
                </form>
              )
            )}
            <div className={styles.resendContainer}>
              <span className={styles.resendCountdown}>
                {remaining > 0 ? `Gửi lại sau ${remaining}s` : "Cần mã mới?"}
              </span>
              <button
                type="button"
                className={styles.resendBtn}
                disabled={pending || remaining > 0}
                onClick={resend}
              >
                {request.isPending ? "Đang gửi..." : "Gửi lại mã"}
              </button>
            </div>
          </div>
        )}
        <footer className={styles.footerNav}>
          <Link to="/forgot-password" className={styles.footerLink}>
            Yêu cầu mã cho email khác
          </Link>
          <p>
            <Link to="/login" className={styles.footerLink}>
              Quay lại đăng nhập
            </Link>
          </p>
        </footer>
      </section>
    </main>
  );
}
