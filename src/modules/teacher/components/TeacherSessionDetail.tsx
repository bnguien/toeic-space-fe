import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MapPin,
  Monitor,
  Pencil,
  X,
  XCircle,
} from "lucide-react";
import { Button, Modal, sessionsApi, classErrorMessage, type SessionView } from "@/modules/admin";
import { SessionAttendance } from "./SessionAttendance";
import { SessionMeetSection } from "./calendar/SessionMeetSection";
import styles from "./TeacherClassSessions.module.css";

const format = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
const formatTime = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));

const statusLabel = (status: SessionView["status"]) =>
  status === "Scheduled" ? "Đã lên lịch" : status === "Completed" ? "Đã hoàn thành" : "Đã hủy";
const typeLabel = (session: SessionView) =>
  session.sessionType === "Makeup" ? "Học bù" : "Chính khóa";

export function TeacherSessionDetail({
  sessionId,
  teacherId,
  teacherName,
  onClose,
  panel = false,
  canManage = false,
  now,
  onEdit,
  onCancel,
  onComplete,
}: {
  sessionId: string;
  teacherId?: string | null;
  teacherName?: string | null;
  onClose: () => void;
  panel?: boolean;
  canManage?: boolean;
  now?: number;
  onEdit?: (session: SessionView) => void;
  onCancel?: (session: SessionView) => void;
  onComplete?: (session: SessionView) => void;
}) {
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const detail = useQuery({
    queryKey: ["teacher", "session", sessionId],
    queryFn: ({ signal }) => sessionsApi.get(sessionId, signal),
    retry: false,
  });

  if (detail.isPending) {
    return panel ? (
      <aside className={styles.detailPanel}>
        <div className={styles.panelHeader}>
          <h2>Chi tiết buổi học</h2>
          <button
            type="button"
            className={styles.panelClose}
            aria-label="Đóng chi tiết"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <p role="status">Đang tải buổi học…</p>
      </aside>
    ) : (
      <Modal open title="Chi tiết buổi học" wide onClose={onClose}>
        <p role="status">Đang tải buổi học…</p>
      </Modal>
    );
  }

  if (detail.isError) {
    const content = (
      <p role="alert">
        {classErrorMessage(detail.error)}{" "}
        <button onClick={() => void detail.refetch()}>Thử lại</button>
      </p>
    );
    return panel ? (
      <aside className={styles.detailPanel}>
        <div className={styles.panelHeader}>
          <h2>Chi tiết buổi học</h2>
          <button
            type="button"
            className={styles.panelClose}
            aria-label="Đóng chi tiết"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {content}
      </aside>
    ) : (
      <Modal open title="Chi tiết buổi học" wide onClose={onClose}>
        {content}
      </Modal>
    );
  }

  const session = detail.data;
  const status = statusLabel(session.status);
  const canAct = session.status === "Scheduled" && session.teacherId === teacherId;
  const canComplete = canAct && now !== undefined && Date.parse(session.endAt) <= now;

  const panelBody = (
    <>
      <div className={styles.panelSession}>
        <span className={styles.panelIcon} data-status={session.status}>
          {session.status === "Completed" ? (
            <CheckCircle2 size={22} />
          ) : session.status === "Cancelled" ? (
            <XCircle size={22} />
          ) : session.mode === "Online" ? (
            <Monitor size={22} />
          ) : session.sessionType === "Makeup" ? (
            <GraduationCap size={22} />
          ) : (
            <BookOpen size={22} />
          )}
        </span>
        <div>
          <h3>{session.title}</h3>
          <div className={styles.panelBadges}>
            <span className={styles.panelType}>{typeLabel(session)}</span>
            <span className={styles.panelStatus} data-status={session.status}>
              {status}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.panelFacts}>
        <div className={styles.panelFact}>
          <CalendarDays size={16} />
          <div>
            <span className={styles.panelFactLabel}>Thời gian</span>
            <p>
              {formatDate(session.startAt)}
              <br />
              {formatTime(session.startAt)} – {formatTime(session.endAt)}
            </p>
          </div>
        </div>
        <div className={styles.panelFact}>
          {session.mode === "Online" ? <Monitor size={16} /> : <MapPin size={16} />}
          <div>
            <span className={styles.panelFactLabel}>Hình thức</span>
            <p>{session.mode === "Online" ? "Trực tuyến" : "Trực tiếp"}</p>
          </div>
        </div>
        <div className={styles.panelFact}>
          <MapPin size={16} />
          <div>
            <span className={styles.panelFactLabel}>Phòng học</span>
            <p>
              {session.mode === "Online" ? "Google Meet" : (session.roomName ?? "Phòng mặc định")}
            </p>
          </div>
        </div>
        {session.notes && (
          <div className={styles.panelFact}>
            <ClipboardList size={16} />
            <div>
              <span className={styles.panelFactLabel}>Ghi chú</span>
              <p>{session.notes}</p>
            </div>
          </div>
        )}
      </div>
      {session.cancellationReason && (
        <p className={styles.panelReason}>Lý do hủy: {session.cancellationReason}</p>
      )}
      {session.mode === "Online" && <SessionMeetSection session={session} role="teacher" heading />}
      <div className={styles.panelActions}>
        {canAct && canManage && (
          <Button variant="primary" icon={<Pencil size={15} />} onClick={() => onEdit?.(session)}>
            Chỉnh sửa
          </Button>
        )}
        {canAct && (
          <div className={styles.panelActionRow}>
            <Button
              variant="danger"
              icon={<XCircle size={15} />}
              onClick={() => onCancel?.(session)}
            >
              Hủy buổi học
            </Button>
            {canComplete && (
              <Button
                variant="default"
                icon={<CheckCircle2 size={15} />}
                onClick={() => onComplete?.(session)}
              >
                Hoàn thành
              </Button>
            )}
          </div>
        )}
        <Button
          variant="default"
          icon={<ClipboardList size={15} />}
          onClick={() => setAttendanceOpen(true)}
        >
          Điểm danh
        </Button>
      </div>
    </>
  );

  const modalBody = (
    <>
      <h3>{session.title}</h3>
      <dl className={styles.facts}>
        <div>
          <dt>Thời gian</dt>
          <dd>
            {format(session.startAt)} – {format(session.endAt)}
          </dd>
        </div>
        <div>
          <dt>Giáo viên</dt>
          <dd>
            {teacherId && session.teacherId === teacherId && teacherName
              ? teacherName
              : "Giáo viên được phân công"}
          </dd>
        </div>
        <div>
          <dt>Hình thức</dt>
          <dd>{session.mode === "Online" ? "Trực tuyến" : "Trực tiếp"}</dd>
        </div>
        <div>
          <dt>Phòng</dt>
          <dd>
            {session.mode === "Online" ? "Không áp dụng" : (session.roomName ?? "Phòng mặc định")}
          </dd>
        </div>
        <div>
          <dt>Trạng thái</dt>
          <dd>{status}</dd>
        </div>
        {session.notes && (
          <div>
            <dt>Ghi chú</dt>
            <dd>{session.notes}</dd>
          </div>
        )}
      </dl>
      {session.cancellationReason && <p>Lý do hủy: {session.cancellationReason}</p>}
      {canAct && (
        <div className={styles.dialogActions}>
          {canManage && (
            <Button variant="primary" icon={<Pencil size={15} />} onClick={() => onEdit?.(session)}>
              Chỉnh sửa
            </Button>
          )}
          <Button variant="danger" icon={<XCircle size={15} />} onClick={() => onCancel?.(session)}>
            Hủy buổi học
          </Button>
          {canComplete && (
            <Button
              variant="default"
              icon={<CheckCircle2 size={15} />}
              onClick={() => onComplete?.(session)}
            >
              Hoàn thành
            </Button>
          )}
        </div>
      )}
      {session.mode === "Online" && <SessionMeetSection session={session} role="teacher" heading />}
      <SessionAttendance sessionId={sessionId} cancelled={session.status === "Cancelled"} />
    </>
  );

  if (panel) {
    return (
      <>
        <aside className={styles.detailPanel}>
          <div className={styles.panelHeader}>
            <h2>Chi tiết buổi học</h2>
            <button
              type="button"
              className={styles.panelClose}
              aria-label="Đóng chi tiết"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
          {panelBody}
        </aside>
        {attendanceOpen && (
          <Modal
            open
            title="Điểm danh"
            wide
            onClose={() => setAttendanceOpen(false)}
            footer={<Button onClick={() => setAttendanceOpen(false)}>Đóng</Button>}
          >
            <SessionAttendance sessionId={sessionId} cancelled={session.status === "Cancelled"} />
          </Modal>
        )}
      </>
    );
  }

  return (
    <Modal
      open
      title="Chi tiết buổi học"
      wide
      onClose={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      {modalBody}
    </Modal>
  );
}
