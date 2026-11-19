import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Clock, Copy, RefreshCw, XCircle } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal/Modal";
import { toast } from "@/shared/components/ui/Toast/toast-store";
import { useCurrentUser } from "@/modules/auth";
import { purchaseApi, money, type OrderResult } from "./purchaseApi";
import { remainingSeconds, shouldPoll } from "./checkoutState";
import styles from "./CheckoutPage.module.css";

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderResult | null;
  courseTitle: string;
  onRestartCheckout: () => void;
  onRefreshEnrollment: () => Promise<void>;
}

export function PaymentModal({
  open,
  onClose,
  order,
  courseTitle,
  onRestartCheckout,
  onRefreshEnrollment,
}: PaymentModalProps) {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [now, setNow] = useState(() => Date.now());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const hasHandledSuccessRef = useRef(false);
  const hasRefreshedRef = useRef(false);

  // Poll order status while modal is open and in non-terminal state
  const orderQuery = useQuery({
    queryKey: ["order", user?.id, order?.id],
    queryFn: ({ signal }) => purchaseApi.order(order!.id, signal),
    enabled: Boolean(open && order?.id && user?.id),
    refetchInterval: (query) => {
      const item = query.state.data;
      if (!item) return 3000;
      if (item.status === "Paid" && item.fulfillment === "Completed") return false;
      if (item.status === "Expired" || item.status === "Cancelled") return false;
      return shouldPoll(item) ? 3000 : false;
    },
    refetchOnWindowFocus: true,
  });

  const currentOrder = orderQuery.data ?? order;
  const isZeroPayment = currentOrder?.finalAmount === 0;

  // Tick for countdown
  useEffect(() => {
    if (!open || !currentOrder || currentOrder.status !== "Pending") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, currentOrder?.status, currentOrder]);

  const { refetch: refetchOrder } = orderQuery;

  // Check deadline passing
  useEffect(() => {
    if (open && currentOrder?.status === "Pending" && Date.parse(currentOrder.expiresAt) <= now) {
      void refetchOrder();
    }
  }, [open, currentOrder?.expiresAt, currentOrder?.status, now, refetchOrder]);

  // Handle successful payment and enrollment completion
  useEffect(() => {
    if (!open || !currentOrder) return;

    const isSuccess = currentOrder.status === "Paid" && currentOrder.fulfillment === "Completed";

    if (isSuccess && !hasHandledSuccessRef.current) {
      hasHandledSuccessRef.current = true;

      // Show toast once on the right side
      toast.success("Thanh toán thành công! Khóa học đã được thêm vào danh sách của bạn.");

      // Refresh enrollment cache
      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        void onRefreshEnrollment();
      }

      // Start 5-second countdown
      setRedirectCountdown(5);
    }
  }, [open, currentOrder?.status, currentOrder?.fulfillment, currentOrder, onRefreshEnrollment]);

  // Countdown effect for redirecting to /my-courses
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      navigate("/my-courses", { replace: true });
      return;
    }

    const timer = window.setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [redirectCountdown, navigate]);

  const handleCopy = async (field: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  if (!currentOrder) return null;

  const seconds = remainingSeconds(currentOrder.expiresAt, now);
  const isPending = currentOrder.status === "Pending" && seconds > 0;
  const isExpired =
    currentOrder.status === "Expired" || (currentOrder.status === "Pending" && seconds <= 0);
  const isCancelled = currentOrder.status === "Cancelled";
  const isPaidAndCompleted =
    currentOrder.status === "Paid" && currentOrder.fulfillment === "Completed";
  const isPaidAndPendingFulfillment =
    currentOrder.status === "Paid" && currentOrder.fulfillment !== "Completed";

  return (
    <Modal
      open={open}
      title="Thanh toán khóa học"
      onClose={onClose}
      busy={isPaidAndCompleted && redirectCountdown !== null && redirectCountdown > 0}
    >
      <div className={styles.modalBody}>
        {/* Course name & Status Badge Header */}
        <div className={styles.modalHeaderCourse}>
          <h3 className={styles.modalCourseTitle} title={courseTitle}>
            {courseTitle}
          </h3>
          <span
            className={`${styles.modalStatusBadge} ${
              isPaidAndCompleted
                ? styles.statusPaid
                : isExpired || isCancelled
                  ? styles.statusExpired
                  : styles.statusPending
            }`}
          >
            {isPaidAndCompleted
              ? "Đã thanh toán"
              : isPaidAndPendingFulfillment
                ? "Đang kích hoạt"
                : isExpired
                  ? "Đã hết hạn"
                  : isCancelled
                    ? "Đã hủy"
                    : "Chờ thanh toán"}
          </span>
        </div>

        {/* Successful payment state */}
        {isPaidAndCompleted ? (
          <div className={styles.successView}>
            <div className={styles.successIconWrapper}>
              <CheckCircle2 size={36} />
            </div>
            <h4 className={styles.successTitle}>
              Thanh toán thành công! Khóa học đã được thêm vào danh sách của bạn.
            </h4>
            <p className={styles.redirectNotice}>
              Đang chuyển đến Khóa học của tôi sau{" "}
              <strong className={styles.countdownHighlight}>{redirectCountdown ?? 5}</strong>{" "}
              giây...
            </p>
            <button
              type="button"
              className={styles.checkoutButton}
              onClick={() => navigate("/my-courses", { replace: true })}
            >
              Vào Khóa học của tôi ngay
            </button>
          </div>
        ) : isPaidAndPendingFulfillment ? (
          /* Payment confirmed but enrollment fulfillment still pending */
          <div className={styles.fulfillingNotice}>
            <Clock size={32} />
            <p>Thanh toán thành công. Hệ thống đang kích hoạt khóa học của bạn...</p>
            <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              Vui lòng giữ cửa sổ này trong khi hệ thống hoàn tất phân quyền.
            </span>
          </div>
        ) : isExpired || isCancelled ? (
          /* Expired / Cancelled State */
          <div className={styles.expiredView}>
            <XCircle size={36} color="var(--ui-rose)" />
            <h4 className={styles.expiredTitle}>
              {isExpired ? "Đơn hàng đã hết hạn thanh toán" : "Đơn hàng đã bị hủy"}
            </h4>
            <p className={styles.orderErrorAlert} style={{ width: "100%", margin: 0 }}>
              Thời gian giữ chỗ hoặc thanh toán đã kết thúc. Vui lòng tạo đơn mới để nhận mã QR mới.
            </p>
            <button
              type="button"
              className={styles.checkoutButton}
              onClick={() => {
                onRestartCheckout();
                onClose();
              }}
            >
              <RefreshCw size={16} /> Tạo đơn mới
            </button>
          </div>
        ) : isZeroPayment ? (
          /* Zero payment order with 100% coupon */
          <div className={styles.fulfillingNotice}>
            <Clock size={32} />
            <p>Đang kích hoạt khóa học miễn phí cho tài khoản của bạn...</p>
          </div>
        ) : isPending ? (
          /* Normal Pending Payment State with QR & Bank Transfer */
          <>
            {/* Centered QR code element */}
            <div className={styles.qrContainer}>
              <div className={styles.qrBox}>
                {currentOrder.qrUrl && !qrError ? (
                  <>
                    {!qrLoaded && <span className={styles.qrLoading}>Đang tải mã QR…</span>}
                    <img
                      src={currentOrder.qrUrl}
                      alt="Mã QR thanh toán SePay"
                      className={styles.qrImage}
                      style={{ display: qrLoaded ? "block" : "none" }}
                      onLoad={() => setQrLoaded(true)}
                      onError={() => setQrError(true)}
                    />
                  </>
                ) : (
                  <div className={styles.qrErrorBox}>
                    <span>Không thể tải mã QR</span>
                    <button
                      type="button"
                      className={styles.copyButton}
                      onClick={() => {
                        setQrLoaded(false);
                        setQrError(false);
                      }}
                    >
                      <RefreshCw size={12} /> Tải lại QR
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Instruction */}
            <div className={styles.instructionBox}>
              Quét mã QR bằng ứng dụng ngân hàng để thanh toán. Vui lòng giữ nguyên số tiền và nội
              dung chuyển khoản.
            </div>

            {/* Bank Transfer Details with Copy Buttons */}
            <div className={styles.bankDetailsCard}>
              {currentOrder.bank && (
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>Ngân hàng nhận</span>
                  <span className={styles.bankValue}>{currentOrder.bank}</span>
                </div>
              )}

              {currentOrder.accountNumber && (
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>Số tài khoản</span>
                  <span className={styles.bankValue}>
                    {currentOrder.accountNumber}
                    <button
                      type="button"
                      className={`${styles.copyButton} ${
                        copiedField === "account" ? styles.copySuccess : ""
                      }`}
                      onClick={() => handleCopy("account", currentOrder.accountNumber!)}
                      aria-label="Sao chép số tài khoản"
                    >
                      {copiedField === "account" ? (
                        <>
                          <Check size={12} /> Đã chép
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Sao chép
                        </>
                      )}
                    </button>
                  </span>
                </div>
              )}

              <div className={styles.bankRow}>
                <span className={styles.bankLabel}>Số tiền</span>
                <span className={styles.bankValue}>
                  {money(currentOrder.finalAmount)}
                  <button
                    type="button"
                    className={`${styles.copyButton} ${
                      copiedField === "amount" ? styles.copySuccess : ""
                    }`}
                    onClick={() => handleCopy("amount", String(currentOrder.finalAmount))}
                    aria-label="Sao chép số tiền"
                  >
                    {copiedField === "amount" ? (
                      <>
                        <Check size={12} /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Sao chép
                      </>
                    )}
                  </button>
                </span>
              </div>

              {currentOrder.paymentReference && (
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>Nội dung CK</span>
                  <span className={styles.bankValue}>
                    {currentOrder.paymentReference}
                    <button
                      type="button"
                      className={`${styles.copyButton} ${
                        copiedField === "reference" ? styles.copySuccess : ""
                      }`}
                      onClick={() => handleCopy("reference", currentOrder.paymentReference!)}
                      aria-label="Sao chép nội dung chuyển khoản"
                    >
                      {copiedField === "reference" ? (
                        <>
                          <Check size={12} /> Đã chép
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Sao chép
                        </>
                      )}
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Remaining payment time */}
            <div
              className={`${styles.timerCountdown} ${
                seconds < 120 ? styles.timerCountdownDanger : ""
              }`}
            >
              Thời gian thanh toán còn lại:{" "}
              <strong>
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </strong>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
