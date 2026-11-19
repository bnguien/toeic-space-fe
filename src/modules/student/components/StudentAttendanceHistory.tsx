import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { sessionsApi } from "@/modules/admin";
import { attendanceApi, attendanceStatusLabels, type AttendanceStatus } from "@/modules/teacher";
import { Select } from "@/shared/components/Select";
import { useStudentClasses } from "../hooks/useStudentClasses";
import styles from "./StudentAttendanceHistory.module.css";

const labels = attendanceStatusLabels;
const format = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

export function StudentAttendanceHistory() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AttendanceStatus | "">("");
  const history = useQuery({
    queryKey: ["student", "my-attendance"],
    queryFn: ({ signal }) => attendanceApi.mine(signal),
    retry: false,
  });
  const classes = useStudentClasses({ page: 1, pageSize: 100 });
  const matching = (history.data ?? []).filter((record) => !status || record.status === status);
  const pageRecords = matching.slice((page - 1) * 10, page * 10);
  const sessionIds = [...new Set(pageRecords.map((record) => record.classSessionId))];
  const sessionQueries = useQueries({
    queries: sessionIds.map((id) => ({
      queryKey: ["student", "class-session", id],
      queryFn: ({ signal }: { signal: AbortSignal }) => sessionsApi.get(id, signal),
      retry: false,
    })),
  });
  const sessions = new Map(sessionIds.map((id, index) => [id, sessionQueries[index]?.data]));
  const classNames = new Map((classes.data?.items ?? []).map((item) => [item.id, item.name]));
  return (
    <section className={styles.section} aria-label="Lịch sử điểm danh">
      <div className={styles.head}>
        <div>
          <h2>Lịch sử điểm danh</h2>
          <p>
            Chỉ hiển thị các buổi đã được giáo viên ghi nhận. Buổi chưa ghi nhận không được tính là
            vắng mặt.
          </p>
        </div>
        <label className={styles.filter}>
          Trạng thái
          <Select
            value={status}
            aria-label="Lọc trạng thái điểm danh"
            options={[
              { value: "", label: "Tất cả" },
              ...Object.entries(labels)
                .filter(([value]) => value !== "NotRecorded")
                .map(([value, label]) => ({ value, label })),
            ]}
            onChange={(value) => {
              setStatus(value as AttendanceStatus | "");
              setPage(1);
            }}
          />
        </label>
      </div>
      {history.isPending ? (
        <p className={styles.notice} role="status">
          Đang tải lịch sử điểm danh…
        </p>
      ) : history.isError ? (
        <div className={styles.notice} role="alert">
          Không thể tải lịch sử điểm danh.{" "}
          <button onClick={() => void history.refetch()}>Thử lại</button>
        </div>
      ) : !matching.length ? (
        <div className={styles.notice}>
          <h3>Chưa có bản ghi điểm danh</h3>
          <p>Kết quả điểm danh sẽ xuất hiện tại đây sau khi giáo viên ghi nhận buổi học.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lớp học</th>
                  <th>Buổi học</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record) => {
                  const session = sessions.get(record.classSessionId);
                  return (
                    <tr key={record.id}>
                      <td>
                        {session
                          ? (classNames.get(session.classId) ?? "Lớp học của tôi")
                          : sessionQueries[sessionIds.indexOf(record.classSessionId)]?.isError
                            ? "Không thể tải lớp"
                            : "Đang tải…"}
                      </td>
                      <td>{session?.title ?? "Buổi học"}</td>
                      <td>
                        {session
                          ? format(session.startAt)
                          : `Ghi nhận ${format(record.recordedAt)}`}
                      </td>
                      <td>
                        <span className={styles.badge}>{labels[record.status]}</span>
                      </td>
                      <td>{record.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {matching.length > 10 && (
            <nav className={styles.pagination} aria-label="Phân trang điểm danh">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Trước
              </button>
              <span>
                Trang {page} / {Math.ceil(matching.length / 10)}
              </span>
              <button disabled={page * 10 >= matching.length} onClick={() => setPage(page + 1)}>
                Sau
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
