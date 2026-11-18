import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge, Button, ConfirmDialog, Modal } from "./ui";
import { toast } from "@/shared/components/ui/Toast/toast-store";
import { useRetryMeet, useSessionMeet } from "../hooks/useClassSessions";
import { classErrorMessage } from "../utils/classErrorMessage";
import type { MeetProvisionStatus, SessionView } from "../types/schedule.types";
import styles from "./ClassSessions.module.css";

const labels: Record<MeetProvisionStatus, string> = {
  Inactive: "Không áp dụng",
  Pending: "Đang chờ xử lý",
  Provisioning: "Đang tạo phòng",
  Ready: "Sẵn sàng",
  NeedsConnection: "Cần kết nối Google",
  Failed: "Tạo phòng thất bại",
};

const tones: Record<MeetProvisionStatus, "green" | "blue" | "rose" | "neutral"> = {
  Inactive: "neutral",
  Pending: "blue",
  Provisioning: "blue",
  Ready: "green",
  NeedsConnection: "rose",
  Failed: "rose",
};

const errorLabels: Record<string, string> = {
  teacher_ineligible: "Giáo viên không còn đủ điều kiện tạo phòng học.",
  google_not_configured: "Dịch vụ Google Meet chưa được cấu hình.",
  google_meet_scope_missing: "Giáo viên chưa cấp quyền tạo phòng Google Meet.",
  google_meet_permission_denied: "Google từ chối quyền tạo phòng học.",
  uncertain_google_result: "Google chưa trả về kết quả chắc chắn; cần thử lại.",
  google_token_unavailable: "Không thể xác thực với Google.",
  credential_revoked: "Quyền truy cập Google đã bị thu hồi.",
};

const descriptions: Record<MeetProvisionStatus, string> = {
  Inactive: "Buổi học không cần hoặc không còn dùng phòng Google Meet.",
  Pending: "Hệ thống đang xếp hàng chuẩn bị phòng học.",
  Provisioning: "Hệ thống đang tạo phòng học với Google.",
  Ready: "Phòng đã sẵn sàng cho người có quyền tham gia.",
  NeedsConnection: "Giáo viên phụ trách cần kết nối Google Meet.",
  Failed: "Lần tạo phòng gần nhất không thành công.",
};

export function SessionMeetDialog({
  session,
  onClose,
}: {
  session: SessionView;
  onClose: () => void;
}) {
  const status = useSessionMeet(session.id);
  const retry = useRetryMeet();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const canRetry =
    session.mode === "Online" && session.status === "Scheduled" && status.data?.status === "Failed";

  const submit = async () => {
    setError("");
    try {
      await retry.mutateAsync(session.id);
      setConfirming(false);
      toast.success("Đã gửi yêu cầu thử lại tạo phòng Google Meet.");
    } catch (cause) {
      setError(classErrorMessage(cause));
    }
  };

  return (
    <>
      <Modal
        open
        title={`Google Meet · ${session.title}`}
        onClose={onClose}
        footer={
          <Button variant="default" onClick={onClose}>
            Đóng
          </Button>
        }
      >
        {status.isPending ? (
          <p className={styles.meetMuted} role="status">
            Đang kiểm tra trạng thái phòng Google Meet…
          </p>
        ) : status.isError ? (
          <div className={styles.errorBanner}>
            {classErrorMessage(status.error)}{" "}
            <button type="button" className={styles.meetLink} onClick={() => void status.refetch()}>
              Thử lại
            </button>
          </div>
        ) : (
          status.data && (
            <div className={styles.meetPanel}>
              <div className={styles.meetSummary}>
                <Badge tone={tones[status.data.status]} dot>
                  {labels[status.data.status]}
                </Badge>
                <span>{descriptions[status.data.status]}</span>
              </div>
              {status.data.errorCode && (
                <div className={styles.meetError}>
                  <strong>
                    {errorLabels[status.data.errorCode] ?? "Không thể tạo phòng Google Meet."}
                  </strong>
                  <code>{status.data.errorCode}</code>
                </div>
              )}
              {canRetry && (
                <div className={styles.meetRetry}>
                  <p>
                    Chỉ thử lại sau khi đã kiểm tra kết nối Google của giáo viên. Hệ thống sẽ đưa
                    phòng về trạng thái chờ và tạo lại.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setError("");
                      setConfirming(true);
                    }}
                  >
                    <RefreshCw size={14} /> Thử lại tạo phòng
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </Modal>
      <ConfirmDialog
        open={confirming}
        title="Thử lại tạo phòng Google Meet?"
        description="Hệ thống sẽ đưa phòng về trạng thái chờ và thử tạo lại bằng kết nối Google hiện tại của giáo viên."
        confirmLabel="Thử lại"
        tone="default"
        pending={retry.isPending}
        error={error}
        onClose={() => setConfirming(false)}
        onConfirm={() => void submit()}
      />
    </>
  );
}
