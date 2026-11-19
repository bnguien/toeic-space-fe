import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, MapPin, Monitor, User, X, XCircle } from "lucide-react";
import type { SessionView } from "@/modules/admin";
import { useCurrentUser } from "@/modules/auth";
import { formatIctSessionDate, formatIctTime, ictWeekdayIndex, weekdayTone } from "./calendarTime";
import { SessionMeetSection } from "./SessionMeetSection";
import styles from "./SessionSchedulePopover.module.css";

const statusLabels: Record<SessionView["status"], string> = {
  Scheduled: "Đã lên lịch",
  Completed: "Đã hoàn thành",
  Cancelled: "Đã hủy",
};

interface Props {
  session: SessionView;
  classLabel: string;
  teacherName?: string | null;
  role: "teacher" | "student";
  anchor: HTMLElement;
  focusOnMount: boolean;
  onRequestClose: () => void;
  onKeepOpen: () => void;
  onRelease: () => void;
  onOpenSession?: (session: SessionView) => void;
  onManageClass?: (session: SessionView) => void;
}

export function SessionSchedulePopover({
  session,
  classLabel,
  teacherName,
  role,
  anchor,
  focusOnMount,
  onRequestClose,
  onKeepOpen,
  onRelease,
  onOpenSession,
  onManageClass,
}: Props) {
  const user = useCurrentUser();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const online = session.mode === "Online";
  const tone = weekdayTone(ictWeekdayIndex(new Date(session.startAt)));
  const resolvedTeacher =
    teacherName ?? (role === "teacher" && session.teacherId === user?.id ? user?.fullName : null);

  const place = useCallback(() => {
    const rect = anchor.getBoundingClientRect();
    const element = popoverRef.current;
    if (!element) return;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const gap = 10;
    let left = rect.right + gap;
    if (left + width > window.innerWidth - 12) left = rect.left - width - gap;
    if (left < 12) left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    let top = rect.top;
    if (top + height > window.innerHeight - 12) top = window.innerHeight - height - 12;
    setPosition({ top: Math.max(12, top), left });
  }, [anchor]);

  useLayoutEffect(() => {
    place();
  }, [place]);

  useEffect(() => {
    const update = () => place();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [place]);

  useEffect(() => {
    const element = popoverRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => place());
    observer.observe(element);
    return () => observer.disconnect();
  }, [place]);

  useEffect(() => {
    if (focusOnMount) popoverRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      role="dialog"
      aria-label={`Chi tiết buổi học ${classLabel}`}
      tabIndex={-1}
      data-calendar-popover
      style={position ? { top: position.top, left: position.left } : { visibility: "hidden" }}
      onPointerEnter={onKeepOpen}
      onPointerLeave={onRelease}
      onFocus={onKeepOpen}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onRelease();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className={styles.header}>
        <span className={styles.dot} style={{ background: tone.accent }} aria-hidden="true" />
        <div className={styles.title}>
          <strong>{classLabel}</strong>
          {session.title !== classLabel && <p>{session.title}</p>}
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="Đóng chi tiết buổi học"
          onClick={onRequestClose}
        >
          <X size={16} />
        </button>
      </header>

      <p className={styles.when}>
        {formatIctSessionDate(session.startAt)} · {formatIctTime(session.startAt)} –{" "}
        {formatIctTime(session.endAt)}
      </p>

      <div className={styles.divider} />

      {online && <SessionMeetSection session={session} role={role} />}

      <dl className={styles.facts}>
        <div>
          <dt>{online ? <Monitor size={15} /> : <MapPin size={15} />} Hình thức</dt>
          <dd>{online ? "Trực tuyến" : "Trực tiếp"}</dd>
        </div>
        {!online && (
          <div>
            <dt>
              <MapPin size={15} /> Phòng học
            </dt>
            <dd>
              {session.roomName || "Chưa cập nhật phòng học"}
              {session.centerName ? ` · ${session.centerName}` : ""}
            </dd>
          </div>
        )}
        {resolvedTeacher && (
          <div>
            <dt>
              <User size={15} /> Giáo viên
            </dt>
            <dd>{resolvedTeacher}</dd>
          </div>
        )}
        <div>
          <dt>
            {session.status === "Completed" ? (
              <CheckCircle2 size={15} />
            ) : session.status === "Cancelled" ? (
              <XCircle size={15} />
            ) : (
              <Clock size={15} />
            )}{" "}
            Trạng thái
          </dt>
          <dd>
            <span className={styles.badge} data-status={session.status}>
              {statusLabels[session.status]}
            </span>
          </dd>
        </div>
        {session.cancellationReason && (
          <div>
            <dt>Lý do hủy</dt>
            <dd>{session.cancellationReason}</dd>
          </div>
        )}
      </dl>

      {(onOpenSession || onManageClass) && (
        <footer className={styles.actions}>
          {onManageClass && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => onManageClass(session)}
            >
              {role === "student" ? "Xem chi tiết lớp" : "Quản lý lớp học"}
            </button>
          )}
          {onOpenSession && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => onOpenSession(session)}
            >
              Xem chi tiết buổi
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
