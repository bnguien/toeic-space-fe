import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CheckCircle2, ExternalLink, RefreshCw, Unplug, Video } from "lucide-react";
import { Badge, Button, ConfirmDialog } from "@/modules/admin";
import { toast } from "@/shared/components/ui/Toast/toast-store";
import {
  useConnectGoogleMeet,
  useDisconnectGoogleMeet,
  useGoogleMeetStatus,
} from "../hooks/useGoogleMeet";
import styles from "./TeacherGoogleMeetCard.module.css";

const errorMessages: Record<string, string> = {
  teacher_not_eligible: "Tài khoản giáo viên chưa đủ điều kiện kết nối Google Meet.",
  google_not_configured: "Dịch vụ Google Meet chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
  google_oauth_denied: "Bạn đã từ chối cấp quyền Google. Hãy thử kết nối lại khi sẵn sàng.",
  google_oauth_exchange_failed: "Google không thể hoàn tất kết nối. Vui lòng thử lại.",
  google_refresh_token_missing:
    "Google không trả về quyền truy cập lâu dài. Hãy kết nối lại và chọn cấp quyền đầy đủ.",
  google_meet_scope_missing:
    "Bạn chưa cấp quyền tạo phòng Google Meet. Hãy kết nối lại và chấp thuận quyền này.",
  google_email_unverified: "Email Google phải được xác minh trước khi kết nối.",
  invalid_oauth_state: "Phiên cấp quyền đã hết hạn. Vui lòng bắt đầu kết nối lại.",
};

function errorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (code && errorMessages[code]) return errorMessages[code];
    if (!error.response) return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
    if (error.response.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
    if (error.response.status === 403) return "Bạn không có quyền quản lý kết nối Google Meet.";
  }
  return "Không thể hoàn tất thao tác. Vui lòng thử lại.";
}

const connectedAt = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : null;

export function TeacherGoogleMeetCard() {
  const client = useQueryClient();
  const status = useGoogleMeetStatus();
  const connect = useConnectGoogleMeet();
  const disconnect = useDisconnectGoogleMeet();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [connectError, setConnectError] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnectError, setDisconnectError] = useState("");

  const refresh = async () => {
    setConnectError("");
    try {
      const result = await status.refetch();
      void client.invalidateQueries({ queryKey: ["class-session-meet"] });
      if (result.data?.connected) toast.success("Đã cập nhật kết nối Google Meet.");
      else if (result.data)
        toast.info("Chưa thấy kết nối Google. Hãy hoàn tất cấp quyền rồi thử lại.");
    } catch {
      // The query error state already explains the failure.
    }
  };

  const startConnect = async () => {
    setConnectError("");
    setAuthUrl(null);
    try {
      const result = await connect.mutateAsync();
      setAuthUrl(result.authorizationUrl);
      const tab = window.open(result.authorizationUrl, "_blank");
      if (tab) tab.opener = null;
      else {
        setConnectError(
          "Trình duyệt đã chặn cửa sổ Google. Hãy dùng liên kết bên dưới để tiếp tục.",
        );
      }
    } catch (error) {
      setConnectError(errorMessage(error));
    }
  };

  const remove = async () => {
    setDisconnectError("");
    try {
      await disconnect.mutateAsync();
      setConfirmDisconnect(false);
      setAuthUrl(null);
      toast.success("Đã ngắt kết nối Google Meet.");
    } catch (error) {
      setDisconnectError(errorMessage(error));
    }
  };

  const data = status.data;
  const connected = data?.connected === true;

  return (
    <section className={styles.card} aria-labelledby="teacher-google-meet-title">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon} aria-hidden="true">
            <Video size={18} />
          </span>
          <div>
            <h2 id="teacher-google-meet-title">Kết nối Google Meet</h2>
            <p>Dùng tài khoản Google để tự động tạo phòng học cho các buổi trực tuyến.</p>
          </div>
        </div>
        {data && (
          <Badge tone={connected ? "green" : "rose"} dot>
            {connected ? "Đã kết nối" : "Chưa kết nối"}
          </Badge>
        )}
      </header>

      {status.isPending ? (
        <p className={styles.notice} role="status">
          Đang kiểm tra kết nối Google…
        </p>
      ) : status.isError ? (
        <div className={styles.error} role="alert">
          <span>{errorMessage(status.error)}</span>
          <Button size="sm" variant="default" onClick={() => void refresh()}>
            <RefreshCw size={14} /> Thử lại
          </Button>
        </div>
      ) : connected ? (
        <>
          <div className={styles.account}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <div>
              <strong>{data.email ?? "Tài khoản Google đã kết nối"}</strong>
              {connectedAt(data.connectedAt) && (
                <small>Kết nối lúc {connectedAt(data.connectedAt)}</small>
              )}
            </div>
          </div>
          <p className={styles.hint}>
            Các buổi học trực tuyến đã lên lịch sẽ được chuẩn bị phòng Google Meet tự động. Nếu đổi
            tài khoản, hãy ngắt kết nối rồi kết nối lại.
          </p>
          <div className={styles.actions}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void refresh()}
              disabled={status.isFetching}
            >
              <RefreshCw size={14} /> Kiểm tra lại
            </Button>
            <Button
              size="sm"
              variant="danger-outline"
              onClick={() => {
                setDisconnectError("");
                setConfirmDisconnect(true);
              }}
            >
              <Unplug size={14} /> Ngắt kết nối
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.hint}>
            Kết nối tài khoản Google để ToeicSpace có thể tạo phòng Meet cho những buổi học trực
            tuyến. ToeicSpace chỉ lưu kết nối ở máy chủ và không lưu token trong trình duyệt.
          </p>
          {authUrl && (
            <div className={styles.verify} role="status">
              <p>
                Đã mở trang cấp quyền Google trong tab mới. Sau khi hoàn tất, hãy quay lại đây và
                chọn <strong>Tôi đã kết nối</strong>.
              </p>
              <a href={authUrl} target="_blank" rel="noreferrer noopener">
                Mở lại trang cấp quyền Google <ExternalLink size={13} />
              </a>
            </div>
          )}
          {connectError && (
            <p className={styles.error} role="alert">
              {connectError}
            </p>
          )}
          <div className={styles.actions}>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void startConnect()}
              disabled={connect.isPending}
            >
              <Video size={14} /> {connect.isPending ? "Đang tạo liên kết…" : "Kết nối Google"}
            </Button>
            {authUrl && (
              <Button
                size="sm"
                variant="default"
                onClick={() => void refresh()}
                disabled={status.isFetching}
              >
                <RefreshCw size={14} /> Tôi đã kết nối
              </Button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        title="Ngắt kết nối Google Meet?"
        description="Các phòng đã tạo sẽ không còn khả dụng cho đến khi bạn kết nối lại Google Meet."
        confirmLabel="Ngắt kết nối"
        tone="danger"
        pending={disconnect.isPending}
        error={disconnectError}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
