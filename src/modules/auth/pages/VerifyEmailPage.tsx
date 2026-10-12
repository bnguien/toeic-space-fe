import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import oyWaitingMascot from "@/assets/mascot/oy2-waiting.png";

import styles from "../components/AuthScreen.module.css";
import { OtpInput } from "../components/OtpInput";
import { useResendVerification, useVerifyEmail } from "../hooks/useAuth";
import { verifyEmailSchema } from "../schemas/verify-email.schema";
import {
  clearVerificationSession,
  getResendErrorMessage,
  getRetryAfterSeconds,
  getVerificationSession,
  getVerifyErrorMessage,
  maskEmail,
  updateVerificationChallenge,
} from "../utils/auth-helpers";

const DEFAULT_COOLDOWN = 60;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load session from sessionStorage on initial render
  const initialSession = getVerificationSession();

  const [session, setSession] = useState(initialSession);
  const [currentChallengeId, setCurrentChallengeId] = useState(initialSession?.challengeId || "");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  // Status banners
  const [infoMessage, setInfoMessage] = useState<string | null>(() => {
    const locState = location.state as { registered?: boolean } | null;
    if (locState?.registered) {
      return "Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.";
    }
    return null;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown for resend OTP
  const [countdown, setCountdown] = useState<number>(DEFAULT_COOLDOWN);
  const countdownTimerRef = useRef<number | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  // If no temporary verification state exists, redirect to /register
  useEffect(() => {
    if (!session?.email || !session?.challengeId) {
      navigate("/register", { replace: true });
    }
  }, [session, navigate]);

  // Handle cooldown countdown
  useEffect(() => {
    if (countdown > 0) {
      countdownTimerRef.current = window.setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [countdown]);

  // Cancel delayed navigation on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  if (!session?.email || !session?.challengeId) {
    return null;
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const validationResult = verifyEmailSchema.safeParse({ otp });
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      setOtpError(firstIssue?.message || "Mã OTP không hợp lệ.");
      return;
    }

    const { otp: validatedOtp } = validationResult.data;

    // Dismiss info message when attempting verification
    setInfoMessage(null);

    verifyMutation.mutate(
      {
        challengeId: currentChallengeId,
        otp: validatedOtp,
      },
      {
        onSuccess: () => {
          // Clear all temporary verification storage
          clearVerificationSession();
          setSuccessMessage("Xác thực email thành công! Đang chuyển đến trang đăng nhập...");
          if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
          }
          redirectTimerRef.current = window.setTimeout(() => {
            navigate("/login", {
              replace: true,
              state: { verified: true },
            });
          }, 1500);
        },
        onError: () => {
          setInfoMessage(null);
        },
      },
    );
  };

  const handleResend = () => {
    if (countdown > 0 || resendMutation.isPending) {
      return;
    }

    setOtpError(null);
    verifyMutation.reset();

    resendMutation.mutate(
      { email: session.email },
      {
        onSuccess: (res) => {
          // Update the challenge with the new one
          const nextChallengeId = res.challengeId;
          setCurrentChallengeId(nextChallengeId);
          updateVerificationChallenge(nextChallengeId);
          setSession((prev) => (prev ? { ...prev, challengeId: nextChallengeId } : null));

          // Clear any entered OTP
          setOtp("");

          // Reset cooldown
          setCountdown(DEFAULT_COOLDOWN);

          // Display opaque message to prevent email enumeration
          setInfoMessage("Nếu email hợp lệ và chưa được xác thực, mã OTP mới đã được gửi.");
        },
        onError: (error) => {
          // If 429 rate limit exceeded, sync countdown with backend retry duration if available
          const retrySeconds = getRetryAfterSeconds(error);
          if (retrySeconds && retrySeconds > 0) {
            setCountdown(retrySeconds);
          } else {
            setCountdown(DEFAULT_COOLDOWN);
          }
        },
      },
    );
  };

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="verify-title">
        <header className={styles.header}>
          <img className={styles.mascot} src={oyWaitingMascot} alt="" width="112" height="112" />
          <span className={styles.eyebrow}>TOEIC SPACE · XÁC THỰC EMAIL</span>
          <h1 id="verify-title">Nhập mã xác thực</h1>
          <p>
            Mã OTP 6 chữ số đã được gửi đến địa chỉ email:{" "}
            <span className={styles.emailHighlight}>{maskEmail(session.email)}</span>
          </p>
        </header>

        {successMessage ? (
          <div className={styles.alertSuccess} role="status">
            {successMessage}
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleVerify} noValidate>
            {infoMessage && !verifyMutation.isError && !resendMutation.isError && (
              <div className={styles.alertInfo} role="status">
                {infoMessage}
              </div>
            )}

            {verifyMutation.isError && (
              <p id="verify-error" className={styles.alert} role="alert">
                {getVerifyErrorMessage(verifyMutation.error)}
              </p>
            )}

            {resendMutation.isError && (
              <p className={styles.alert} role="alert">
                {getResendErrorMessage(resendMutation.error)}
              </p>
            )}

            <div className={styles.field}>
              <label htmlFor="otp-input">Mã OTP (6 chữ số)</label>
              <OtpInput
                id="otp-input"
                value={otp}
                onChange={(nextOtp) => {
                  setOtp(nextOtp);
                  if (otpError) {
                    setOtpError(null);
                  }
                }}
                disabled={verifyMutation.isPending || Boolean(successMessage)}
                hasError={Boolean(otpError || verifyMutation.isError)}
                aria-describedby={
                  otpError ? "otp-error" : verifyMutation.isError ? "verify-error" : undefined
                }
              />
              {otpError && (
                <small id="otp-error" className={styles.fieldError}>
                  {otpError}
                </small>
              )}
            </div>

            <div className={styles.resendContainer}>
              {countdown > 0 ? (
                <span className={styles.resendCountdown}>
                  Gửi lại sau: <strong>{countdown}s</strong>
                </span>
              ) : (
                <span className={styles.resendCountdown}>Chưa nhận được mã?</span>
              )}

              <button
                type="button"
                className={styles.resendBtn}
                disabled={countdown > 0 || resendMutation.isPending || Boolean(successMessage)}
                onClick={handleResend}
              >
                {resendMutation.isPending ? "Đang gửi..." : "Gửi lại mã"}
              </button>
            </div>

            <button
              type="submit"
              className={styles.submit}
              disabled={
                verifyMutation.isPending || !/^[0-9]{6}$/.test(otp) || Boolean(successMessage)
              }
            >
              {verifyMutation.isPending ? "Đang xác thực..." : "Xác thực"}
            </button>
          </form>
        )}

        <footer className={styles.footerNav}>
          <span>Quay lại </span>
          <Link to="/login" className={styles.footerLink}>
            Đăng nhập
          </Link>
          <span> hoặc </span>
          <Link to="/register" className={styles.footerLink}>
            Đổi thông tin đăng ký
          </Link>
        </footer>
      </section>
    </main>
  );
}
