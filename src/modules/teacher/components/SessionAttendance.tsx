import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmDialog, classErrorMessage } from "@/modules/admin";
import { Select } from "@/shared/components/Select";
import { toast } from "@/shared/components/ui/Toast/toast-store";
import {
  attendanceApi,
  attendanceStatusLabels,
  type AttendanceInput,
  type AttendanceStatus,
} from "../api/attendance.api";
import styles from "./SessionAttendance.module.css";

const labels = attendanceStatusLabels;

export function SessionAttendance({
  sessionId,
  cancelled,
}: {
  sessionId: string;
  cancelled: boolean;
}) {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, AttendanceInput>>({});
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const rosterKey = ["teacher", "attendance", sessionId, search];
  const roster = useQuery({
    queryKey: rosterKey,
    queryFn: ({ signal }) => attendanceApi.roster(sessionId, search, signal),
    retry: false,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["teacher", "attendance", sessionId] });
  const bulk = useMutation({
    mutationFn: (items: AttendanceInput[]) => attendanceApi.bulk(sessionId, items),
    onSuccess: async () => {
      setSelected({});
      setError("");
      await refresh();
      toast.success("Đã lưu điểm danh đã chọn.");
    },
    onError: (cause) => setError(classErrorMessage(cause)),
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => attendanceApi.remove(sessionId, studentId),
    onSuccess: async (_data, studentId) => {
      setSelected((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      setRemoveId(null);
      setError("");
      await refresh();
      toast.success("Đã xóa bản ghi điểm danh.");
    },
    onError: (cause) => setError(classErrorMessage(cause)),
  });
  const choose = (
    studentId: string,
    status: AttendanceStatus | "NotRecorded",
    note: string | null,
  ) => {
    setSelected((current) => {
      const next = { ...current };
      if (next[studentId]) delete next[studentId];
      else
        next[studentId] = {
          studentId,
          status: status === "NotRecorded" ? "Present" : status,
          note,
        };
      return next;
    });
  };
  return (
    <section className={styles.section}>
      <h3>Điểm danh (tùy chọn)</h3>
      <p>Chỉ ghi nhận học viên được chọn. Học viên còn lại vẫn là Chưa ghi nhận.</p>
      <input
        aria-label="Tìm học viên"
        placeholder="Tìm tên hoặc email học viên..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {roster.isPending ? (
        <p role="status">Đang tải danh sách học viên…</p>
      ) : roster.isError ? (
        <p role="alert">
          {classErrorMessage(roster.error)}{" "}
          <button onClick={() => void roster.refetch()}>Thử lại</button>
        </p>
      ) : roster.data.length === 0 ? (
        <p>Không có học viên phù hợp.</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Chọn</th>
                <th>Học viên</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {roster.data.map((student) => {
                const draft = selected[student.studentId];
                return (
                  <tr key={student.studentId}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${student.name}`}
                        checked={Boolean(draft)}
                        disabled={cancelled || bulk.isPending}
                        onChange={() =>
                          choose(student.studentId, student.status, student.record?.note ?? null)
                        }
                      />
                    </td>
                    <td>
                      <strong>{student.name}</strong>
                      <small>{student.email}</small>
                    </td>
                    <td>
                      {draft ? (
                        <Select
                          aria-label={`Trạng thái ${student.name}`}
                          value={draft.status}
                          options={Object.entries(labels)
                            .filter(([key]) => key !== "NotRecorded")
                            .map(([value, label]) => ({ value, label }))}
                          onChange={(value) =>
                            setSelected((current) => ({
                              ...current,
                              [student.studentId]: {
                                ...current[student.studentId],
                                status: value as AttendanceStatus,
                              },
                            }))
                          }
                        />
                      ) : (
                        labels[student.status]
                      )}
                    </td>
                    <td>
                      {draft ? (
                        <input
                          aria-label={`Ghi chú ${student.name}`}
                          maxLength={1000}
                          value={draft.note ?? ""}
                          onChange={(e) =>
                            setSelected((current) => ({
                              ...current,
                              [student.studentId]: {
                                ...current[student.studentId],
                                note: e.target.value || null,
                              },
                            }))
                          }
                        />
                      ) : (
                        (student.record?.note ?? "—")
                      )}
                    </td>
                    <td>
                      {student.record && !cancelled && (
                        <Button size="sm" onClick={() => setRemoveId(student.studentId)}>
                          Xóa bản ghi
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!cancelled && (
        <Button
          variant="primary"
          disabled={
            !Object.keys(selected).length || Object.keys(selected).length > 100 || bulk.isPending
          }
          onClick={() => bulk.mutate(Object.values(selected))}
        >
          {bulk.isPending ? "Đang lưu…" : `Lưu ${Object.keys(selected).length} học viên đã chọn`}
        </Button>
      )}
      {Object.keys(selected).length > 100 && (
        <p role="alert" className={styles.error}>
          Chọn tối đa 100 học viên mỗi lần lưu.
        </p>
      )}
      <ConfirmDialog
        open={Boolean(removeId)}
        title="Xóa bản ghi điểm danh?"
        description="Học viên sẽ trở về trạng thái Chưa ghi nhận; các bản ghi khác không thay đổi."
        confirmLabel="Xóa bản ghi"
        tone="danger"
        pending={remove.isPending}
        error={error}
        onClose={() => {
          setRemoveId(null);
          setError("");
        }}
        onConfirm={() => removeId && remove.mutate(removeId)}
      />
    </section>
  );
}
