import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button, EmptyState } from "@/modules/admin";
import { useCurrentUser } from "@/modules/auth";
import { useRefreshEnrollment } from "./purchaseHooks";
import { purchaseApi, money, vnd } from "./purchaseApi";
import { purchaseError } from "./purchaseError";
import { checkoutKey, remainingSeconds, shouldPoll } from "./checkoutState";
import styles from "./purchase.module.css";

export function OrderPage() {
  const { id = "" } = useParams();
  const user = useCurrentUser();
  const [now, setNow] = useState(() => Date.now());
  const [copyError, setCopyError] = useState("");
  const [qrError, setQrError] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const order = useQuery({
    queryKey: ["order", user?.id, id],
    queryFn: ({ signal }) => purchaseApi.order(id, signal),
    enabled: Boolean(id && user?.id),
    retry: false,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const item = query.state.data;
      return shouldPoll(item) ? 5000 : false;
    },
  });
  const refresh = useRefreshEnrollment(order.data?.courseId ?? "");
  const completed = order.data?.fulfillment === "Completed";
  useEffect(() => {
    const item = order.data;
    if (!item || item.status === "Pending" || !user) return;
    sessionStorage.removeItem(checkoutKey(user.id, item.courseId, item.couponCode));
  }, [order.data, user]);
  useEffect(() => {
    if (completed) void refresh();
    // Refresh once when fulfillment becomes authoritative; no client-side entitlement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);
  useEffect(() => {
    if (!order.data || order.data.status !== "Pending") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [order.data]);
  useEffect(() => {
    if (order.data?.status === "Pending" && Date.parse(order.data.expiresAt) <= now)
      void order.refetch();
    // Only recheck on crossing the deadline, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.data?.expiresAt, order.data?.status, now < Date.parse(order.data?.expiresAt ?? "")]);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyError("");
    } catch {
      setCopyError("Không thể sao chép. Vui lòng sao chép thủ công.");
    }
  };
  if (order.isPending)
    return (
      <main className={styles.page}>
        <p role="status">Đang kiểm tra trạng thái đơn hàng…</p>
      </main>
    );
  if (order.isError)
    return (
      <main className={styles.page}>
        <EmptyState
          title="Không tải được đơn hàng"
          description={purchaseError(order.error)}
          action={<Button onClick={() => void order.refetch()}>Thử lại</Button>}
        />
      </main>
    );
  const item = order.data;
  const seconds = remainingSeconds(item.expiresAt, now);
  const pending = item.status === "Pending" && seconds > 0;
  return (
    <main className={styles.page}>
      <Link to="/my-courses">← Khóa học của tôi</Link>
      <h1>Đơn hàng {item.orderCode}</h1>
      <div className={styles.panel}>
        <dl className={styles.summary}>
          <div>
            <dt>Giá gốc</dt>
            <dd>{money(item.originalAmount)}</dd>
          </div>
          {item.discountSource !== "None" && item.discountAmount > 0 && (
            <div>
              <dt>
                {item.discountSource === "Promotion"
                  ? `Khuyến mãi: ${item.promotionName ?? "Khóa học"}`
                  : `Mã giảm giá: ${item.couponCode}`}
              </dt>
              <dd>−{vnd(item.discountAmount)}</dd>
            </div>
          )}
          <div>
            <dt>Số tiền chính xác</dt>
            <dd>
              <strong>{money(item.finalAmount)}</strong> ({item.currency})
            </dd>
          </div>
        </dl>
        {item.status === "Paid" && item.fulfillment === "Completed" ? (
          <>
            <p role="status">Thanh toán đã xác nhận và khóa học đã được kích hoạt.</p>
            <Link className={styles.primaryLink} to={`/my-courses/${item.courseId}`}>
              Bắt đầu học
            </Link>
          </>
        ) : item.status === "Paid" ? (
          <>
            <p role="status">
              Thanh toán đã xác nhận.{" "}
              {item.fulfillment === "NeedsReview"
                ? "Quyền học cần được kiểm tra thủ công; vui lòng liên hệ hỗ trợ kèm mã đơn hàng."
                : "Đang kích hoạt quyền học…"}
            </p>
            <Button onClick={() => void order.refetch()}>Kiểm tra lại</Button>
          </>
        ) : item.status === "Expired" || item.status === "Cancelled" ? (
          <>
            <p role="alert">
              {item.status === "Expired" ? "Đơn hàng đã hết hạn." : "Đơn hàng đã hủy."} Nếu đã
              chuyển khoản muộn, vui lòng liên hệ hỗ trợ và cung cấp mã đơn; giao dịch cần được đối
              soát.
            </p>
            <Link className={styles.primaryLink} to={`/courses/${item.courseId}/checkout`}>
              Bắt đầu đơn mới
            </Link>
          </>
        ) : !pending ? (
          <>
            <p role="status">
              Thời hạn trên đơn đã qua. Đang kiểm tra trạng thái với hệ thống; không chuyển khoản
              theo mã QR cũ.
            </p>
            <Button onClick={() => void order.refetch()}>Kiểm tra lại</Button>
          </>
        ) : (
          <>
            <p role="status">
              Đang chờ thanh toán. Hết hạn lúc {new Date(item.expiresAt).toLocaleString("vi-VN")}.
              Còn {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}.
            </p>
            <p>
              Chỗ học (nếu giới hạn) được giữ tạm đến hạn trên đơn. Chỉ hệ thống mới xác nhận quyền
              học sau khi nhận thanh toán.
            </p>
            {item.qrUrl && !qrError ? (
              <>
                {!qrLoaded && <p role="status">Đang tải mã QR…</p>}
                <img
                  className={styles.qr}
                  style={{ display: qrLoaded ? "block" : "none" }}
                  src={item.qrUrl}
                  alt="Mã QR chuyển khoản SePay theo thông tin đơn hàng"
                  onLoad={() => setQrLoaded(true)}
                  onError={() => setQrError(true)}
                />
              </>
            ) : (
              <p role="alert">
                Không tải được mã QR. Hãy dùng thông tin chuyển khoản dưới đây hoặc tải lại trạng
                thái.{" "}
                <Button
                  onClick={() => {
                    setQrLoaded(false);
                    setQrError(false);
                  }}
                >
                  Tải lại QR
                </Button>
              </p>
            )}
            <dl className={styles.summary}>
              <div>
                <dt>Ngân hàng nhận</dt>
                <dd>{item.bank}</dd>
              </div>
              <div>
                <dt>Số tài khoản</dt>
                <dd>
                  {item.accountNumber}{" "}
                  <Button onClick={() => void copy(item.accountNumber!)}>Sao chép</Button>
                </dd>
              </div>
              <div>
                <dt>Số tiền</dt>
                <dd>
                  {money(item.finalAmount)}{" "}
                  <Button onClick={() => void copy(String(item.finalAmount))}>Sao chép</Button>
                </dd>
              </div>
              <div>
                <dt>Nội dung chuyển khoản</dt>
                <dd>
                  {item.paymentReference}{" "}
                  <Button onClick={() => void copy(item.paymentReference!)}>Sao chép</Button>
                </dd>
              </div>
            </dl>
            <p>
              Vui lòng chuyển đúng số tiền và nội dung. Trạng thái sẽ tự cập nhật sau khi Backend
              nhận thông báo từ SePay.
            </p>
            {copyError && <p role="alert">{copyError}</p>}
          </>
        )}
      </div>
    </main>
  );
}
