import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Video,
  XCircle,
} from "lucide-react";
import { useCurrentUser } from "@/modules/auth";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import {
  classErrorMessage,
  sessionsApi,
  studentScheduleConflictsApi,
  type SessionView,
} from "@/modules/admin";
import type { StudentConflictDetail } from "@/shared/types/student-conflicts.types";
import { SessionSchedulePopover } from "./calendar/SessionSchedulePopover";
import {
  addWallDays,
  formatIctRange,
  formatIctTime,
  ictDateIndex,
  ictTodayKey,
  ictWeekdayIndex,
  layoutDaySessions,
  startOfIctWeek,
  visibleHourRange,
  wallDateKey,
  wallToIso,
  weekdayTone,
  type PositionedSession,
} from "./calendar/calendarTime";
import styles from "./ClassScheduleCalendar.module.css";

const WEEKDAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
const SHORT_WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

interface ActiveSession {
  session: SessionView;
  anchor: HTMLButtonElement;
  focus: boolean;
}

export interface ClassScheduleCalendarProps {
  role: "teacher" | "student";
  classNames: Map<string, string>;
  classTeacherNames?: Map<string, string | null>;
  onOpenSession?: (session: SessionView) => void;
  onManageClass?: (session: SessionView) => void;
}

export function ClassScheduleCalendar({
  role,
  classNames,
  classTeacherNames,
  onOpenSession,
  onManageClass,
}: ClassScheduleCalendarProps) {
  const user = useCurrentUser();
  const isMobile = useMediaQuery("(max-width: 760px)");
  const [weekStart, setWeekStart] = useState(() => startOfIctWeek());
  const [mobileDay, setMobileDay] = useState(() => ictWeekdayIndex());
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [checkedConflictRange, setCheckedConflictRange] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const activeRef = useRef<ActiveSession | null>(null);

  const from = wallToIso(weekStart);
  const to = wallToIso(addWallDays(weekStart, 7));
  const sessions = useQuery({
    queryKey: ["calendar", "class-sessions", role, from, to],
    queryFn: ({ signal }) => sessionsApi.list({ from, to, page: 1, pageSize: 100 }, signal),
    staleTime: 60_000,
    retry: false,
  });
  const conflictCheck = useMutation({
    mutationFn: ({ rangeFrom, rangeTo }: { rangeFrom: string; rangeTo: string }) =>
      studentScheduleConflictsApi.check(rangeFrom, rangeTo),
  });
  const rangeKey = `${from}|${to}`;
  const conflictPreview =
    role === "student" && checkedConflictRange === rangeKey ? conflictCheck.data : undefined;
  const conflictPairs = useMemo(() => {
    const unique = new Map<string, StudentConflictDetail>();
    for (const detail of conflictPreview?.details?.items ?? []) {
      const pair = [detail.first.sessionId, detail.second.sessionId].sort().join(":");
      unique.set(`${pair}:${detail.overlapStart}:${detail.overlapEnd}`, detail);
    }
    return [...unique.values()];
  }, [conflictPreview?.details?.items]);
  const conflictingSessionIds = useMemo(
    () =>
      new Set(conflictPairs.flatMap((detail) => [detail.first.sessionId, detail.second.sessionId])),
    [conflictPairs],
  );
  const items = useMemo(() => sessions.data?.items ?? [], [sessions.data]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setActive(null), 220);
  }, [cancelClose]);
  const closeNow = useCallback(
    (restoreFocus = false) => {
      cancelClose();
      const current = activeRef.current;
      setActive(null);
      if (restoreFocus) current?.anchor.focus({ preventScroll: true });
    },
    [cancelClose],
  );
  const open = useCallback(
    (session: SessionView, anchor: HTMLButtonElement, focus: boolean) => {
      cancelClose();
      setActive({ session, anchor, focus });
    },
    [cancelClose],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (active.anchor.contains(target)) return;
      if (target.closest("[data-calendar-popover]")) return;
      closeNow();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNow(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, closeNow]);

  const goToWeek = (deltaWeeks: number) => {
    closeNow();
    conflictCheck.reset();
    setCheckedConflictRange(null);
    const next = addWallDays(weekStart, deltaWeeks * 7);
    setWeekStart(next);
    const todayOffset = ictDateIndex(new Date().toISOString(), next);
    setMobileDay(todayOffset ?? 0);
  };
  const goToday = () => {
    closeNow();
    conflictCheck.reset();
    setCheckedConflictRange(null);
    setWeekStart(startOfIctWeek());
    setMobileDay(ictWeekdayIndex());
  };

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addWallDays(weekStart, index)),
    [weekStart],
  );
  const todayKey = ictTodayKey();
  const visibleDayIndexes = isMobile ? [mobileDay] : [0, 1, 2, 3, 4, 5, 6];
  const grouped = useMemo(() => {
    const groups: SessionView[][] = Array.from({ length: 7 }, () => []);
    for (const session of items) {
      if (role === "student" && session.status === "Cancelled") continue;
      const index = ictDateIndex(session.startAt, weekStart);
      if (index !== null) groups[index].push(session);
    }
    return groups;
  }, [items, role, weekStart]);
  const weekSessions = useMemo(() => grouped.flat(), [grouped]);
  const { startHour, endHour } = visibleHourRange(weekSessions);
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const gridStyle = {
    gridTemplateColumns: `56px repeat(${visibleDayIndexes.length}, minmax(0, 1fr))`,
  };
  const hoursStyle = { "--hours": hours.length } as CSSProperties;
  const rangeLabel = `${formatIctRange(from, wallToIso(addWallDays(weekStart, 6)))}, ${new Intl.DateTimeFormat(
    "vi-VN",
    { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" },
  ).format(new Date(from))}`;

  const openSession = (session: SessionView, anchor: HTMLButtonElement, focus: boolean) => {
    open(session, anchor, focus);
  };
  const classLabel = (session: SessionView) => classNames.get(session.classId) ?? session.title;
  const teacherName = (session: SessionView) =>
    session.teacherId === user?.id
      ? (user?.fullName ?? null)
      : (classTeacherNames?.get(session.classId) ?? null);
  const checkStudentConflicts = async () => {
    if (role !== "student" || conflictCheck.isPending) return;
    setCheckedConflictRange(null);
    try {
      await conflictCheck.mutateAsync({ rangeFrom: from, rangeTo: to });
      setCheckedConflictRange(rangeKey);
    } catch {
      // The explicit action renders the request error below; regular Calendar fetching is separate.
    }
  };

  return (
    <section className={styles.calendar} aria-label="Lịch học theo tuần">
      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button type="button" aria-label="Tuần trước" onClick={() => goToWeek(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Tuần sau" onClick={() => goToWeek(1)}>
            <ChevronRight size={18} />
          </button>
          <strong className={styles.range}>{rangeLabel}</strong>
        </div>
        <div className={styles.tools}>
          {role === "student" && (
            <button
              type="button"
              className={styles.conflictCheckButton}
              disabled={conflictCheck.isPending}
              onClick={() => void checkStudentConflicts()}
            >
              <AlertTriangle size={14} />
              {conflictCheck.isPending ? "Đang kiểm tra…" : "Kiểm tra trùng lịch"}
            </button>
          )}
          <button type="button" className={styles.todayButton} onClick={goToday}>
            Hôm nay
          </button>
        </div>
      </div>

      {role === "student" && conflictCheck.isPending && (
        <div className={styles.conflictPanel} role="status">
          Đang kiểm tra trùng lịch trong tuần này…
        </div>
      )}
      {role === "student" && conflictCheck.isError && (
        <div className={styles.conflictPanel} data-error role="alert">
          <span>Không thể kiểm tra trùng lịch: {classErrorMessage(conflictCheck.error)}</span>
          <button type="button" onClick={() => void checkStudentConflicts()}>
            Thử lại
          </button>
        </div>
      )}
      {role === "student" && conflictPreview && (
        <div className={styles.conflictPanel} data-conflict={conflictPreview.conflictCount > 0}>
          {conflictPreview.conflictCount === 0 ? (
            <p>Không phát hiện buổi học trùng lịch trong khoảng tuần này.</p>
          ) : (
            <>
              <p>
                Có{" "}
                <strong>{conflictPreview.conflictCount} xung đột giữa các buổi học của bạn</strong>
                trong khoảng tuần này.
              </p>
              {conflictPairs.length > 0 && (
                <ul className={styles.conflictList}>
                  {conflictPairs.slice(0, 6).map((detail) => (
                    <li
                      key={`${detail.first.sessionId}:${detail.second.sessionId}:${detail.overlapStart}`}
                    >
                      <span>
                        {classNames.get(detail.first.classId) ?? "Buổi học"}:{" "}
                        {formatIctTime(detail.first.startAt)}–{formatIctTime(detail.first.endAt)}
                      </span>
                      <span>
                        {classNames.get(detail.second.classId) ?? "Buổi học"}:{" "}
                        {formatIctTime(detail.second.startAt)}–{formatIctTime(detail.second.endAt)}
                      </span>
                      <small>
                        Trùng giờ {formatIctTime(detail.overlapStart)}–
                        {formatIctTime(detail.overlapEnd)}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
              {conflictPreview.details &&
                conflictPreview.details.totalCount > Math.min(conflictPairs.length, 6) && (
                  <small className={styles.conflictMore}>
                    Hiển thị {Math.min(conflictPairs.length, 6)} nhóm thời gian trong tổng số{" "}
                    {conflictPreview.conflictCount} xung đột.
                  </small>
                )}
            </>
          )}
        </div>
      )}

      {isMobile && (
        <div className={styles.weekStrip} role="group" aria-label="Chọn ngày trong tuần">
          {days.map((day, index) => (
            <button
              key={wallDateKey(day)}
              type="button"
              aria-pressed={index === mobileDay}
              aria-label={`${WEEKDAY_LABELS[index]} ${day.getUTCDate()}`}
              data-active={index === mobileDay}
              data-today={wallDateKey(day) === todayKey}
              onClick={() => {
                closeNow();
                setMobileDay(index);
              }}
            >
              <small>{SHORT_WEEKDAY_LABELS[index]}</small>
              <b>{day.getUTCDate()}</b>
            </button>
          ))}
        </div>
      )}

      {sessions.isPending ? (
        <div className={styles.state} role="status">
          Đang tải lịch học…
        </div>
      ) : sessions.isError ? (
        <div className={styles.state} role="alert">
          <p>{classErrorMessage(sessions.error)}</p>
          <button type="button" onClick={() => void sessions.refetch()}>
            Thử lại
          </button>
        </div>
      ) : weekSessions.length === 0 ? (
        <div className={styles.state}>
          <h3>Chưa có buổi học trong tuần này</h3>
          <p>Chuyển tuần hoặc quay lại sau khi lớp được xếp lịch.</p>
        </div>
      ) : (
        <div className={styles.scroller}>
          <div className={styles.headRow} style={gridStyle}>
            <div className={styles.zoneCell}>GMT+07:00</div>
            {visibleDayIndexes.map((index) => (
              <div
                key={wallDateKey(days[index])}
                className={styles.dayHead}
                data-today={wallDateKey(days[index]) === todayKey}
              >
                <small>{WEEKDAY_LABELS[index]}</small>
                <b>{days[index].getUTCDate()}</b>
              </div>
            ))}
          </div>
          <div className={styles.bodyRow} style={gridStyle}>
            <div className={styles.times}>
              {hours.map((hour) => (
                <div key={hour} className={styles.timeCell}>
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {visibleDayIndexes.map((index) => (
              <div
                key={wallDateKey(days[index])}
                className={styles.dayColumn}
                style={hoursStyle}
                data-today={wallDateKey(days[index]) === todayKey}
              >
                {layoutDaySessions(grouped[index], startHour).map((positioned) => (
                  <SessionCard
                    key={positioned.session.id}
                    positioned={positioned}
                    dayIndex={index}
                    label={classLabel(positioned.session)}
                    active={active?.session.id === positioned.session.id}
                    conflict={
                      role === "student" && conflictingSessionIds.has(positioned.session.id)
                    }
                    onOpen={openSession}
                    onClose={scheduleClose}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <SessionSchedulePopover
          key={active.session.id}
          session={active.session}
          classLabel={classLabel(active.session)}
          teacherName={teacherName(active.session)}
          role={role}
          anchor={active.anchor}
          focusOnMount={active.focus}
          onRequestClose={() => closeNow(true)}
          onKeepOpen={cancelClose}
          onRelease={scheduleClose}
          onOpenSession={
            onOpenSession
              ? (session) => {
                  closeNow();
                  onOpenSession(session);
                }
              : undefined
          }
          onManageClass={
            onManageClass
              ? (session) => {
                  closeNow();
                  onManageClass(session);
                }
              : undefined
          }
        />
      )}
    </section>
  );
}

function SessionCard({
  positioned,
  dayIndex,
  label,
  active,
  conflict,
  onOpen,
  onClose,
}: {
  positioned: PositionedSession;
  dayIndex: number;
  label: string;
  active: boolean;
  conflict: boolean;
  onOpen: (session: SessionView, anchor: HTMLButtonElement, focus: boolean) => void;
  onClose: () => void;
}) {
  const { session } = positioned;
  const tone =
    session.status === "Cancelled"
      ? { background: "#f1f4f6", accent: "#98a6b3", text: "#67788a" }
      : weekdayTone(dayIndex);
  const time = `${formatIctTime(session.startAt)} – ${formatIctTime(session.endAt)}`;
  return (
    <button
      type="button"
      data-calendar-event
      className={styles.event}
      data-status={session.status}
      data-active={active}
      data-conflict={conflict || undefined}
      data-compact={positioned.height < 44}
      aria-haspopup="dialog"
      aria-expanded={active}
      style={{
        top: positioned.top,
        left: positioned.left,
        width: positioned.width,
        background: tone.background,
        borderLeftColor: tone.accent,
        color: tone.text,
      }}
      aria-label={`${label}, ${session.title}, ${time}, ${
        session.mode === "Online" ? "trực tuyến" : "trực tiếp"
      }, ${session.status === "Scheduled" ? "đã lên lịch" : session.status === "Completed" ? "đã hoàn thành" : "đã hủy"}`}
      onPointerEnter={(event) => onOpen(session, event.currentTarget, false)}
      onPointerLeave={onClose}
      onFocus={(event) => onOpen(session, event.currentTarget, true)}
      onBlur={onClose}
      onClick={(event) => onOpen(session, event.currentTarget, true)}
    >
      <strong>{label}</strong>
      <span>
        {time}
        {session.mode === "Online" ? (
          <Video size={11} aria-hidden="true" />
        ) : (
          <MapPin size={11} aria-hidden="true" />
        )}
        {session.status === "Completed" && <CheckCircle2 size={11} aria-hidden="true" />}
        {session.status === "Cancelled" && <XCircle size={11} aria-hidden="true" />}
      </span>
    </button>
  );
}
