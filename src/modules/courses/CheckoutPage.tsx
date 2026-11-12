import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Clock, Tag } from "lucide-react";
import { Button, EmptyState } from "@/modules/admin";
import { useCurrentUser } from "@/modules/auth";
import { usePublicCourse } from "./courseCatalog";
import { useEnrollment, useRefreshEnrollment } from "./purchaseHooks";
import { purchaseApi, money, vnd, type OrderResult } from "./purchaseApi";
import { purchaseError } from "./purchaseError";
import { checkoutKey, quoteChanged, remainingSeconds } from "./checkoutState";
import { PaymentModal } from "./PaymentModal";
import styles from "./CheckoutPage.module.css";

export function CheckoutPage() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const client = useQueryClient();
  const course = usePublicCourse(courseId);
  const enrollment = useEnrollment(courseId);
  const refreshEnrollment = useRefreshEnrollment(courseId);

  const [input, setInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [priceChanged, setPriceChanged] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Automatically redirect to /my-courses if user already owns the course
  useEffect(() => {
    if (enrollment.data && !isModalOpen) {
      navigate("/my-courses", { replace: true });
    }
  }, [enrollment.data, isModalOpen, navigate]);

  // Active reservation timer for limited-capacity courses
  useEffect(() => {
    if (!order || order.status !== "Pending") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [order?.status, order]);

  // Preview quote with or without coupon
  const quote = useQuery({
    queryKey: ["checkout-preview", user?.id, courseId, coupon],
    queryFn: ({ signal }) => purchaseApi.preview(courseId, coupon, signal),
    enabled: Boolean(
      user?.id &&
      courseId &&
      course.data?.price &&
      course.data.remainingSeats !== 0 &&
      enrollment.isSuccess &&
      !enrollment.data,
    ),
    retry: false,
    staleTime: 30_000,
  });

  const applyCoupon = async (event: FormEvent) => {
    event.preventDefault();
    if (checkout.isPending) return;
    setCouponError("");
    const code = input.trim().toUpperCase();
    if (!code) {
      setCoupon(null);
      return;
    }
    try {
      const result = await purchaseApi.preview(courseId, code);
      client.setQueryData(["checkout-preview", user?.id, courseId, code], result);
      setCoupon(code);
    } catch (error) {
      setCouponError(purchaseError(error));
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setInput("");
    setCouponError("");
    if (order) {
      sessionStorage.removeItem(checkoutKey(user!.id, courseId, coupon));
      setOrder(null);
    }
    void quote.refetch();
  };

  const checkout = useMutation({
    mutationFn: async () => {
      const key = checkoutKey(user!.id, courseId, coupon);
      let reference = sessionStorage.getItem(key);
      if (!reference) {
        reference = crypto.randomUUID();
        sessionStorage.setItem(key, reference);
      }
      return purchaseApi.checkout(courseId, reference, coupon);
    },
    onSuccess: (result) => {
      setOrder(result);
      const changed = !quote.data || quoteChanged(quote.data, result);
      setPriceChanged(changed);
      setIsModalOpen(true);
    },
    onError: () => {
      void quote.refetch();
      void course.refetch();
    },
  });

  const handleProceedToPayment = () => {
    if (order && order.status === "Pending") {
      const secondsLeft = remainingSeconds(order.expiresAt, now);
      if (secondsLeft > 0) {
        setIsModalOpen(true);
        return;
      }
    }
    checkout.mutate();
  };

  const handleRestartCheckout = () => {
    sessionStorage.removeItem(checkoutKey(user!.id, courseId, coupon));
    setOrder(null);
    setPriceChanged(false);
    void quote.refetch();
    void course.refetch();
  };

  if (
    course.isPending ||
    enrollment.isPending ||
    (course.data?.price &&
      course.data.remainingSeats !== 0 &&
      enrollment.isSuccess &&
      !enrollment.data &&
      quote.isPending)
  ) {
    return (
      <main className={styles.page}>
        <p role="status">Đang kiểm tra thông tin thanh toán…</p>
      </main>
    );
  }

  if (
    quote.isError &&
    course.isSuccess &&
    enrollment.isSuccess &&
    course.data.price > 0 &&
    !enrollment.data &&
    !order &&
    !(course.data.capacity !== null && course.data.remainingSeats === 0)
  ) {
    return (
      <main className={styles.page}>
        <EmptyState
          title={coupon ? "Không thể áp dụng mã giảm giá" : "Không thể tải giá thanh toán"}
          description={purchaseError(quote.error)}
          action={
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <Button onClick={() => void quote.refetch()}>Thử lại</Button>
              {coupon && <Button onClick={removeCoupon}>Bỏ mã giảm giá</Button>}
            </div>
          }
        />
      </main>
    );
  }

  if (course.isError || enrollment.isError) {
    return (
      <main className={styles.page}>
        <EmptyState
          title="Không thể chuẩn bị đơn hàng"
          description={purchaseError(course.error ?? enrollment.error)}
          action={
            <Button
              onClick={() => {
                void course.refetch();
                void enrollment.refetch();
                void quote.refetch();
              }}
            >
              Thử lại
            </Button>
          }
        />
      </main>
    );
  }

  if (enrollment.data && !isModalOpen) {
    return (
      <main className={styles.page}>
        <p role="status">Bạn đã sở hữu khóa học. Đang chuyển hướng đến Khóa học của tôi…</p>
      </main>
    );
  }

  if (!course.data || course.data.price === 0) {
    return (
      <main className={styles.page}>
        <EmptyState
          title="Khóa học không cần thanh toán"
          action={
            <Link className={styles.backLink} to={`/courses/${courseId}`}>
              Về trang khóa học
            </Link>
          }
        />
      </main>
    );
  }

  if (course.data.capacity !== null && course.data.remainingSeats === 0 && !order) {
    return (
      <main className={styles.page}>
        <EmptyState
          title="Khóa học đã hết chỗ"
          description="Số chỗ có thể thay đổi. Vui lòng kiểm tra lại trước khi thanh toán."
          action={<Button onClick={() => void course.refetch()}>Kiểm tra chỗ trống</Button>}
        />
      </main>
    );
  }

  const display = order ?? quote.data;
  const originalPrice = display?.originalAmount ?? course.data.price;
  const discountAmount = display?.discountAmount ?? 0;
  const finalAmount = display?.finalAmount ?? course.data.price;

  // Reservation countdown logic
  const reservationSeconds =
    order && order.status === "Pending" ? remainingSeconds(order.expiresAt, now) : 0;
  const hasActiveReservation =
    course.data.capacity !== null && order && order.status === "Pending" && reservationSeconds > 0;
  const isReservationExpired =
    course.data.capacity !== null && order && order.status === "Pending" && reservationSeconds <= 0;

  return (
    <main className={styles.page}>
      <Link to={`/courses/${courseId}`} className={styles.backLink}>
        ← Chi tiết khóa học
      </Link>

      <h1 className={styles.heading}>Hoàn tất mua khóa học</h1>

      <div className={styles.layout}>
        {/* Left Column: Course Information and Coupon (approx 60%) */}
        <section className={styles.card} aria-labelledby="course-info-heading">
          <h2 id="course-info-heading" style={{ display: "none" }}>
            Thông tin khóa học và mã giảm giá
          </h2>

          {/* Course Details */}
          <div className={styles.courseRow}>
            <div className={styles.thumbnailWrapper}>
              {course.data.thumbnailUrl ? (
                <img
                  src={course.data.thumbnailUrl}
                  alt={`Ảnh đại diện ${course.data.title}`}
                  className={styles.thumbnailImg}
                />
              ) : (
                <span className={styles.thumbnailFallback}>TOEICSpace</span>
              )}
            </div>

            <div className={styles.courseInfo}>
              <span className={styles.courseBadge}>Khóa học trực tuyến</span>
              <h3 className={styles.courseTitle}>{course.data.title}</h3>
              <span className={styles.originalCoursePrice}>{money(originalPrice)}</span>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* Coupon Section */}
          <div className={styles.couponSection}>
            <h3 className={styles.sectionTitle}>Mã giảm giá</h3>

            {coupon ? (
              <div className={styles.appliedCouponBadge}>
                <span>
                  Mã đang áp dụng: <strong>{coupon}</strong>
                  {discountAmount > 0 && ` (−${vnd(discountAmount)})`}
                </span>
                <button
                  type="button"
                  className={styles.removeCouponBtn}
                  onClick={removeCoupon}
                  disabled={checkout.isPending}
                >
                  Bỏ mã
                </button>
              </div>
            ) : (
              <form className={styles.couponForm} onSubmit={(e) => void applyCoupon(e)}>
                <input
                  className={styles.couponInput}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={32}
                  placeholder="Nhập mã giảm giá"
                  disabled={checkout.isPending}
                />
                <button
                  type="submit"
                  className={styles.couponButton}
                  disabled={checkout.isPending || !input.trim()}
                >
                  <Tag
                    size={14}
                    style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }}
                  />
                  Áp dụng
                </button>
              </form>
            )}

            {couponError && (
              <p className={styles.couponError} role="alert">
                {couponError}
              </p>
            )}
          </div>

          {/* Reservation Timer Section: shown only when limited capacity and active reservation exists */}
          {hasActiveReservation && (
            <div className={styles.reservationBanner}>
              <Clock size={16} />
              <span>
                Thời gian giữ chỗ còn lại:{" "}
                <strong>
                  {Math.floor(reservationSeconds / 60)}:
                  {String(reservationSeconds % 60).padStart(2, "0")}
                </strong>
              </span>
            </div>
          )}

          {isReservationExpired && (
            <div className={styles.reservationBanner} data-expired="true">
              <AlertCircle size={16} />
              <span>Thời gian giữ chỗ đã kết thúc. Vui lòng tạo đơn mới.</span>
            </div>
          )}
        </section>

        {/* Right Column: Order Summary (approx 40%) */}
        <section className={styles.card} aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading" className={styles.summaryTitle}>
            Tóm tắt đơn hàng
          </h2>

          <div className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <span>Giá gốc</span>
              <span className={styles.summaryValue}>{money(originalPrice)}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Giảm giá</span>
              <span
                className={`${styles.summaryValue} ${
                  discountAmount > 0 ? styles.summaryValueDiscount : ""
                }`}
              >
                {discountAmount > 0 ? `−${vnd(discountAmount)}` : "0 ₫"}
              </span>
            </div>
            {display?.discountSource !== "None" && display?.discountAmount && (
              <p role="status">
                {display.discountSource === "Promotion"
                  ? `Khuyến mãi tự động: ${display.promotionName ?? "Khóa học"}`
                  : `Mã giảm giá: ${coupon ?? (order?.couponCode || "")}`}
                {"promotionExpiresAt" in display &&
                  display.promotionExpiresAt &&
                  ` · Kết thúc ${new Date(display.promotionExpiresAt).toLocaleString("vi-VN")}`}
              </p>
            )}
          </div>

          <hr className={styles.divider} />

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Tổng thanh toán</span>
            <span className={styles.totalAmount}>{money(finalAmount)}</span>
          </div>

          {priceChanged && (
            <p className={styles.priceChangeAlert} role="alert">
              Giá hoặc ưu đãi đã thay đổi khi tạo đơn. Vui lòng kiểm tra số tiền trên đơn mới trước
              khi thanh toán.
            </p>
          )}

          {checkout.isError && (
            <p className={styles.orderErrorAlert} role="alert">
              {purchaseError(checkout.error)}
            </p>
          )}

          {order && (order.status === "Expired" || order.status === "Cancelled") ? (
            <button type="button" className={styles.checkoutButton} onClick={handleRestartCheckout}>
              Tạo đơn mới
            </button>
          ) : (
            <button
              type="button"
              className={styles.checkoutButton}
              disabled={checkout.isPending || !display}
              onClick={handleProceedToPayment}
            >
              {checkout.isPending
                ? "Đang tạo đơn…"
                : finalAmount === 0
                  ? "Hoàn tất đăng ký"
                  : "Tiến hành thanh toán"}
            </button>
          )}
        </section>
      </div>

      {/* Payment Modal with SePay QR & Auto Polling */}
      <PaymentModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={order}
        courseTitle={course.data.title}
        onRestartCheckout={handleRestartCheckout}
        onRefreshEnrollment={refreshEnrollment}
      />
    </main>
  );
}
