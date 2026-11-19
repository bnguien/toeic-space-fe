import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ExternalLink, Video } from "lucide-react";
import { sessionsApi, type SessionView } from "@/modules/admin";
import { googleMeetKeys } from "../../hooks/useGoogleMeet";
import styles from "./SessionMeetSection.module.css";

const errorLabels: Record<string, string> = {
  teacher_ineligible: "Giáo viên không còn đủ điều kiện tạo phòng học.",
  google_not_configured: "Dịch vụ Google Meet chưa được cấu hình.",
  google_meet_scope_missing: "Giáo viên chưa cấp quyền tạo phòng Google Meet.",
  google_meet_permission_denied:
    "Google đã từ chối quyền tạo phòng học. Vui lòng kiểm tra lại kết nối Google Meet.",
  uncertain_google_result: "Google chưa trả về kết quả chắc chắn. Vui lòng thử lại sau.",
  google_token_unavailable:
    "Không thể xác thực với Google. Vui lòng kiểm tra lại kết nối Google Meet.",
  credential_revoked: "Quyền truy cập Google đã bị thu hồi. Vui lòng kết nối lại.",
  meet_link_unavailable:
    "Liên kết phòng học hiện không khả dụng. Trạng thái phòng có thể vừa thay đổi.",
  forbidden_class: "Bạn không còn quyền truy cập lớp học này.",
  session_not_found: "Không tìm thấy buổi học.",
};

function requestError(error: unknown) {
  if (isAxiosError(error)) {
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (code && errorLabels[code]) return errorLabels[code];
    if (!error.response) return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
    if (error.response.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
    if (error.response.status === 403) return "Bạn không có quyền truy cập phòng học này.";
    if (error.response.status === 404) return "Không tìm thấy buổi học.";
  }
  return "Không thể lấy thông tin phòng học. Vui lòng thử lại.";
}

export function SessionMeetSection({
  session,
  role,
  heading = false,
}: {
  session: SessionView;
  role: "teacher" | "student";
  heading?: boolean;
}) {
  const client = useQueryClient();
  const active = session.mode === "Online" && session.status === "Scheduled";
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const status = useQuery({
    queryKey: googleMeetKeys.sessionStatus(session.id),
    queryFn: ({ signal }) => sessionsApi.meetStatus(session.id, signal),
    enabled: active,
    retry: false,
    staleTime: 30_000,
  });

  if (!active) return null;

  const label = heading ? (
    <div className={styles.heading}>
      <Video size={15} /> Google Meet
    </div>
  ) : null;

  const state = (message: string, retry?: () => void, isError = false) => (
    <div className={styles.section}>
      {label}
      <p className={styles.state} role={isError ? "alert" : "status"}>
        {message}{" "}
        {retry && (
          <button type="button" className={styles.linkButton} onClick={retry}>
            Thử lại
          </button>
        )}
      </p>
    </div>
  );

  if (status.isPending) return state("Đang kiểm tra phòng học…");

  if (status.isError) return state(requestError(status.error), () => void status.refetch(), true);

  const value = status.data.status;
  if (value === "Inactive") return null;

  if (value === "NeedsConnection") {
    return state(
      role === "teacher"
        ? "Bạn cần kết nối Google Meet trong Hồ sơ giảng viên để tạo phòng học cho buổi này."
        : "Phòng học trực tuyến chưa sẵn sàng. Vui lòng quay lại sau.",
    );
  }

  if (value === "Pending") {
    return state("Đang chờ hệ thống chuẩn bị phòng học…");
  }

  if (value === "Provisioning") {
    return state("Đang tạo phòng Google Meet…");
  }

  if (value === "Failed") {
    const detail =
      role === "teacher" && status.data.errorCode
        ? ` ${errorLabels[status.data.errorCode] ?? ""}`.trimEnd()
        : "";
    return state(
      `${role === "teacher" ? "Không thể tạo phòng học trực tuyến cho buổi này." : "Phòng học trực tuyến chưa khả dụng."}${detail}`,
    );
  }

  if (!status.data.canJoin) {
    return state(
      role === "student"
        ? "Phòng học chưa mở để tham gia. Vui lòng thử lại sát giờ học hoặc trong thời gian diễn ra buổi học."
        : "Phòng học chưa sẵn sàng để tham gia.",
    );
  }

  const join = async () => {
    if (joining) return;
    setJoinError(null);
    setFallbackUrl(null);
    setJoining(true);
    let tab: Window | null = null;
    try {
      tab = window.open("about:blank", "_blank");
      if (tab) tab.opener = null;
    } catch {
      tab = null;
    }
    try {
      const link = await client.fetchQuery({
        queryKey: googleMeetKeys.sessionLink(session.id),
        queryFn: ({ signal }) => sessionsApi.meetLink(session.id, signal),
        staleTime: 60_000,
        retry: false,
      });
      if (!link.url) throw new Error("empty_meet_link");
      if (tab) tab.location.replace(link.url);
      else setFallbackUrl(link.url);
    } catch (error) {
      tab?.close();
      setJoinError(requestError(error));
      if (isAxiosError(error) && error.response?.status === 403) {
        void client.invalidateQueries({ queryKey: googleMeetKeys.sessionStatus(session.id) });
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className={styles.section}>
      {label}
      <button
        type="button"
        className={styles.join}
        onClick={() => void join()}
        disabled={joining}
        aria-busy={joining}
      >
        <Video size={16} /> {joining ? "Đang lấy liên kết…" : "Tham gia Google Meet"}
      </button>
      {fallbackUrl && (
        <a className={styles.fallback} href={fallbackUrl} target="_blank" rel="noreferrer noopener">
          Trình duyệt đã chặn tab mới. Mở Google Meet <ExternalLink size={12} />
        </a>
      )}
      {joinError && (
        <p className={styles.error} role="alert">
          {joinError}{" "}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setJoinError(null);
              void status.refetch();
            }}
          >
            Kiểm tra lại
          </button>
        </p>
      )}
    </div>
  );
}
