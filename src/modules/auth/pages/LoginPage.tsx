import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useSearchParams } from "react-router-dom";

import helloMascot from "@/assets/mascot/oy2-hello.png";

import styles from "../components/AuthScreen.module.css";
import { SessionScreen } from "../components/SessionScreen";
import { useLogin, useSessionStatus } from "../hooks/useAuth";
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import { getLoginErrorMessage, getSafeRedirect } from "../utils/auth-helpers";
import { restoreSession } from "../utils/session";

export function LoginPage() {
  const status = useSessionStatus();
  const [params] = useSearchParams();
  const next = getSafeRedirect(params.get("next"));
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
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

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="login-title">
        <header className={styles.header}>
          <img className={styles.mascot} src={helloMascot} alt="" width="112" height="112" />
          <span className={styles.eyebrow}>TOEIC SPACE · ADMIN CMS</span>
          <h1 id="login-title">Đăng nhập quản trị</h1>
          <p>Dành cho quản trị viên và giáo viên quản lý ngân hàng đề.</p>
        </header>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {login.isError && (
            <p className={styles.alert} role="alert">
              {getLoginErrorMessage(login.error)}
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

        <p className={styles.note}>
          Phiên đăng nhập tự kết thúc sau 24 giờ không hoạt động. Không đăng nhập trên máy dùng
          chung.
        </p>
      </section>
    </main>
  );
}
