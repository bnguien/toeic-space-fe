import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import helloMascot from "@/assets/mascot/oy2-hello.png";

import styles from "../components/AuthScreen.module.css";
import { SessionScreen } from "../components/SessionScreen";
import {
  useCurrentUser,
  useLogin,
  useResendVerification,
  useSessionStatus,
} from "../hooks/useAuth";
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import {
  getLoginErrorCode,
  getLoginErrorMessage,
  getResendErrorMessage,
  getSafeRedirect,
  setVerificationSession,
} from "../utils/auth-helpers";
import { restoreSession } from "../utils/session";

interface LoginPageProps {
  isAdmin?: boolean;
}

export function LoginPage({ isAdmin = false }: LoginPageProps) {
  const navigate = useNavigate();
  const status = useSessionStatus();
  const currentUser = useCurrentUser();
  const [params] = useSearchParams();
  const location = useLocation();
  const isVerified = Boolean((location.state as { verified?: boolean } | null)?.verified);

  const defaultTarget = isAdmin
    ? "/admin"
    : currentUser?.role === "Admin" || currentUser?.role === "Teacher"
      ? "/admin"
      : "/";
  const next = getSafeRedirect(params.get("next"), defaultTarget);

  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const resendMutation = useResendVerification();

  const {
    register,
    handleSubmit,
    resetField,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    void restoreSession();
  }, []);

  if (status === "authenticated") {
    return <Navigate to={next} replace />;
  }

  if (status === "idle" || status === "restoring") {
    return <SessionScreen variant="loading" />;
  }

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      // The password never stays in the form after a failed attempt.
      onError: () => resetField("password"),
    }),
  );

  // Email verification resend prompt is only offered on the user login flow
  const isEmailNotVerified =
    !isAdmin && login.isError && getLoginErrorCode(login.error) === "AUTH_EMAIL_NOT_VERIFIED";

  const handleResendAndVerify = () => {
    const email = getValues("email")?.trim();
    if (!email) {
      return;
    }

    resendMutation.mutate(
      { email },
      {
        onSuccess: (res) => {
          setVerificationSession({
            email,
            challengeId: res.challengeId,
            userId: res.userId,
          });
          navigate("/verify-email", {
            state: {
              registered: true,
              email,
            },
          });
        },
      },
    );
  };

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="login-title">
        <header className={styles.header}>
          <img className={styles.mascot} src={helloMascot} alt="" width="112" height="112" />
          <span className={styles.eyebrow}>
            {isAdmin ? "TOEIC SPACE · ADMIN CMS" : "TOEIC SPACE · ĐĂNG NHẬP"}
          </span>
          <h1 id="login-title">{isAdmin ? "Đăng nhập quản trị" : "Đăng nhập"}</h1>
          <p>
            {isAdmin
              ? "Dành cho quản trị viên và giáo viên quản lý ngân hàng đề."
              : "Chào mừng bạn quay trở lại với TOEIC SPACE."}
          </p>
        </header>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {isVerified && (
            <p className={styles.alertSuccess} role="status">
              Xác thực email thành công. Vui lòng đăng nhập để tiếp tục.
            </p>
          )}

          {login.isError && (
            <div className={styles.alert} role="alert">
              <span>{getLoginErrorMessage(login.error)}</span>
              {isEmailNotVerified && (
                <button
                  type="button"
                  className={styles.alertActionBtn}
                  disabled={resendMutation.isPending}
                  onClick={handleResendAndVerify}
                >
                  {resendMutation.isPending ? "Đang gửi mã..." : "Xác thực ngay →"}
                </button>
              )}
            </div>
          )}

          {resendMutation.isError && (
            <p className={styles.alert} role="alert">
              {getResendErrorMessage(resendMutation.error)}
            </p>
          )}

          <div className={styles.field}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <small id="login-email-error" className={styles.fieldError}>
                {errors.email.message}
              </small>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password">Mật khẩu</label>
            <div className={styles.passwordBox}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                maxLength={128}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password")}
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
            {errors.password && (
              <small id="login-password-error" className={styles.fieldError}>
                {errors.password.message}
              </small>
            )}
          </div>

          <button type="submit" className={styles.submit} disabled={login.isPending}>
            {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        {isAdmin ? (
          <>
            <p className={styles.note}>
              Phiên đăng nhập tự kết thúc sau 24 giờ không hoạt động. Không đăng nhập trên máy dùng
              chung.
            </p>
            <footer className={styles.footerNav}>
              <Link to="/login" className={styles.footerLink}>
                ← Đến trang đăng nhập học viên
              </Link>
            </footer>
          </>
        ) : (
          <footer className={styles.footerNav}>
            <div>
              <span>Chưa có tài khoản? </span>
              <Link to="/register" className={styles.footerLink}>
                Đăng ký ngay
              </Link>
            </div>
            <div style={{ marginTop: "10px" }}>
              <Link
                to="/admin/login"
                className={styles.footerLink}
                style={{ fontSize: "12px", opacity: 0.75 }}
              >
                Đăng nhập quản trị viên
              </Link>
            </div>
          </footer>
        )}
      </section>
    </main>
  );
}
