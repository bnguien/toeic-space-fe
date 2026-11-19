import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionsApi, classErrorMessage } from "@/modules/admin";
import { ClassSessionList, SessionMeetSection } from "@/modules/teacher";
import styles from "../pages/StudentClassesPage.module.css";

const format = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function StudentClassSessions({
  classId,
  teacherId,
  teacherName,
}: {
  classId: string;
  teacherId: string | null;
  teacherName: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["student", "class-session", selectedId],
    queryFn: ({ signal }) => sessionsApi.get(selectedId!, signal),
    enabled: Boolean(selectedId),
    retry: false,
  });
  return (
    <section className={styles.detail}>
      <h2>Buổi học</h2>
      <ClassSessionList
        key={classId}
        classId={classId}
        audience="student"
        teacherId={teacherId}
        teacherName={teacherName}
        onSelect={(session) => setSelectedId(session.id)}
      />
      {selectedId && (
        <div className={styles.readOnly}>
          <button type="button" onClick={() => setSelectedId(null)}>
            Đóng chi tiết
          </button>
          {detail.isPending ? (
            <p role="status">Đang tải chi tiết…</p>
          ) : detail.isError ? (
            <p role="alert">{classErrorMessage(detail.error)}</p>
          ) : (
            <>
              <dl className={styles.facts}>
                <div>
                  <dt>Buổi học</dt>
                  <dd>{detail.data.title}</dd>
                </div>
                <div>
                  <dt>Thời gian</dt>
                  <dd>
                    {format(detail.data.startAt)} – {format(detail.data.endAt)}
                  </dd>
                </div>
                <div>
                  <dt>Giáo viên</dt>
                  <dd>
                    {teacherId && detail.data.teacherId === teacherId && teacherName
                      ? teacherName
                      : "Giáo viên được phân công"}
                  </dd>
                </div>
                <div>
                  <dt>Hình thức</dt>
                  <dd>{detail.data.mode === "Online" ? "Trực tuyến" : "Trực tiếp"}</dd>
                </div>
                <div>
                  <dt>Phòng học</dt>
                  <dd>
                    {detail.data.mode === "Online"
                      ? "Không áp dụng"
                      : (detail.data.roomName ?? "Phòng mặc định")}
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    {detail.data.status === "Scheduled"
                      ? "Đã lên lịch"
                      : detail.data.status === "Completed"
                        ? "Đã hoàn thành"
                        : "Đã hủy"}
                  </dd>
                </div>
                {detail.data.cancellationReason && (
                  <div>
                    <dt>Lý do hủy</dt>
                    <dd>{detail.data.cancellationReason}</dd>
                  </div>
                )}
              </dl>
              {detail.data.mode === "Online" && (
                <SessionMeetSection session={detail.data} role="student" heading />
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
