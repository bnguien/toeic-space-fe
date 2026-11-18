import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Monitor, Search } from "lucide-react";
import { DatePicker } from "@/shared/components/DatePicker";
import { Select } from "@/shared/components/Select";
import {
  sessionsApi,
  classErrorMessage,
  type SessionStatus,
  type SessionView,
} from "@/modules/admin";
import styles from "./ClassSessionList.module.css";

const labels: Record<SessionStatus, string> = {
  Scheduled: "Đã lên lịch",
  Completed: "Đã hoàn thành",
  Cancelled: "Đã hủy",
};
const format = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
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

const sessionTypeLabel = (session: SessionView) =>
  session.sessionType === "Makeup" ? "Học bù" : "Chính khóa";

export function ClassSessionList({
  classId,
  audience,
  teacherId,
  teacherName,
  renderActions,
  onSelect,
  variant = "table",
  selectedId,
  searchable = false,
  toolbarAction,
}: {
  classId?: string;
  audience: "teacher" | "student";
  teacherId?: string | null;
  teacherName?: string | null;
  renderActions?: (session: SessionView) => ReactNode;
  onSelect?: (session: SessionView) => void;
  variant?: "table" | "cards";
  selectedId?: string | null;
  searchable?: boolean;
  toolbarAction?: ReactNode;
}) {
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().slice(0, 10);
  });
  const [status, setStatus] = useState<SessionStatus | "">("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const fromIso = from ? new Date(`${from}T00:00:00`).toISOString() : "";
  const toIso = to ? new Date(`${to}T23:59:59`).toISOString() : "";
  const validRange = Boolean(
    fromIso &&
    toIso &&
    fromIso < toIso &&
    Date.parse(toIso) - Date.parse(fromIso) <= 366 * 86_400_000,
  );
  const sessions = useQuery({
    queryKey: [audience, "class-sessions", classId ?? "all", from, to, status, page],
    queryFn: ({ signal }) =>
      sessionsApi.list(
        {
          classId: classId ?? "",
          from: fromIso,
          to: toIso,
          status: status || undefined,
          page,
          pageSize: 20,
        },
        signal,
      ),
    enabled: validRange,
    retry: false,
  });
  const teacherLabel = (session: SessionView) =>
    teacherId && session.teacherId === teacherId && teacherName
      ? teacherName
      : "Giáo viên được phân công";
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...(sessions.data?.items ?? [])]
      .filter((session) =>
        needle
          ? `${session.title} ${session.roomName ?? ""} ${session.centerName ?? ""} ${session.mode}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort((left, right) =>
        sort === "asc"
          ? Date.parse(left.startAt) - Date.parse(right.startAt)
          : Date.parse(right.startAt) - Date.parse(left.startAt),
      );
  }, [query, sessions.data?.items, sort]);

  return (
    <section className={styles.section} data-variant={variant}>
      <div className={styles.filters}>
        <div className={styles.dateRange} role="group" aria-label="Khoảng ngày">
          <label className={styles.dateField}>
            <span className={styles.rangeLabel}>Từ</span>
            <DatePicker
              className={styles.datePicker}
              value={from}
              onChange={(value) => {
                setFrom(value);
                setPage(1);
              }}
            />
          </label>
          <span className={styles.rangeDivider} aria-hidden="true" />
          <label className={styles.dateField}>
            <span className={styles.rangeLabel}>Đến</span>
            <DatePicker
              className={styles.datePicker}
              value={to}
              onChange={(value) => {
                setTo(value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <div className={styles.statusField}>
          <Select
            className={styles.statusPicker}
            value={status}
            aria-label="Lọc trạng thái buổi học"
            options={[
              { value: "", label: "Tất cả trạng thái" },
              ...Object.entries(labels).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(value) => {
              setStatus(value as SessionStatus | "");
              setPage(1);
            }}
          />
        </div>
        {searchable && (
          <label className={styles.searchField}>
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm buổi học..."
              aria-label="Tìm buổi học"
            />
          </label>
        )}
      </div>
      {toolbarAction && <div className={styles.toolbarRow}>{toolbarAction}</div>}
      {variant === "cards" && (
        <div className={styles.listHeader}>
          <h3>Danh sách buổi học ({items.length} buổi)</h3>
          <label className={styles.sort}>
            Sắp xếp:
            <Select
              value={sort}
              aria-label="Sắp xếp buổi học"
              options={[
                { value: "asc", label: "Thời gian (sớm nhất)" },
                { value: "desc", label: "Thời gian (muộn nhất)" },
              ]}
              onChange={(value) => setSort(value as "asc" | "desc")}
            />
          </label>
        </div>
      )}
      {!validRange ? (
        <p role="alert">Chọn khoảng ngày hợp lệ (tối đa 366 ngày).</p>
      ) : sessions.isPending ? (
        <p role="status">Đang tải buổi học…</p>
      ) : sessions.isError ? (
        <p role="alert">
          {classErrorMessage(sessions.error)}{" "}
          <button type="button" onClick={() => void sessions.refetch()}>
            Thử lại
          </button>
        </p>
      ) : !items.length ? (
        <p>Không có buổi học nào trong khoảng ngày này.</p>
      ) : (
        <>
          {variant === "cards" ? (
            <div className={styles.cards}>
              {items.map((session) => {
                const actions = renderActions?.(session);
                const selected = selectedId === session.id;
                return (
                  <article
                    key={session.id}
                    className={`${styles.sessionCard} ${selected ? styles.selectedCard : ""}`}
                    data-session-card
                    data-status={session.status}
                  >
                    <div className={styles.cardMain}>
                      <div className={styles.cardTitleLine}>
                        <strong title={session.title}>{session.title}</strong>
                        <span className={styles.typeBadge} data-type={session.sessionType}>
                          {sessionTypeLabel(session)}
                        </span>
                      </div>
                      <div className={styles.cardMeta}>
                        <span>
                          <CalendarDays size={15} /> {formatDate(session.startAt)}
                        </span>
                        <span>
                          <Clock size={15} /> {formatTime(session.startAt)} –{" "}
                          {formatTime(session.endAt)}
                        </span>
                        <span>
                          {session.mode === "Online" ? <Monitor size={15} /> : <MapPin size={15} />}
                          {session.mode === "Online"
                            ? "Trực tuyến · Google Meet"
                            : `Trực tiếp · ${session.roomName ?? "Phòng mặc định"}`}
                          {session.centerName ? ` · ${session.centerName}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardAside}>
                      <span className={styles.badge} data-status={session.status}>
                        {labels[session.status]}
                      </span>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          aria-label={`Xem chi tiết ${session.title}`}
                          onClick={() => onSelect?.(session)}
                        >
                          Chi tiết
                        </button>
                        {actions ??
                          (renderActions ? (
                            <span className={styles.actionSpacer} aria-hidden="true" />
                          ) : null)}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Buổi học</th>
                    <th>Thời gian</th>
                    {audience === "student" && <th>Giáo viên</th>}
                    <th>Hình thức / Phòng</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((session) => {
                    const actions = renderActions?.(session);
                    return (
                      <tr key={session.id}>
                        <td>
                          <strong title={session.title}>{session.title}</strong>
                          <small>{sessionTypeLabel(session)}</small>
                        </td>
                        <td>
                          {format(session.startAt)} – {format(session.endAt)}
                        </td>
                        {audience === "student" && (
                          <td>
                            <span className={styles.teacherName} title={teacherLabel(session)}>
                              {teacherLabel(session)}
                            </span>
                          </td>
                        )}
                        <td>
                          {session.mode === "Online"
                            ? "Trực tuyến"
                            : `Trực tiếp · ${session.roomName ?? "Phòng mặc định"}`}
                          {session.centerName && ` · ${session.centerName}`}
                        </td>
                        <td>
                          <span className={styles.badge} data-status={session.status}>
                            {labels[session.status]}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              aria-label={`Xem chi tiết ${session.title}`}
                              onClick={() => onSelect?.(session)}
                            >
                              Chi tiết
                            </button>
                            {actions ??
                              (renderActions ? (
                                <span className={styles.actionSpacer} aria-hidden="true" />
                              ) : null)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {sessions.data.totalCount > 20 && (
            <nav className={styles.pagination} aria-label="Phân trang buổi học">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Trước
              </button>
              <span>
                Trang {page} / {Math.ceil(sessions.data.totalCount / 20)}
              </span>
              <button
                disabled={page * 20 >= sessions.data.totalCount}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
