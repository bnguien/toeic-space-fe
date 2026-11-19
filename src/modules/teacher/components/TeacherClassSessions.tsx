import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Plus,
  Users,
  XCircle,
} from "lucide-react";
import { useCurrentUser } from "@/modules/auth";
import {
  Button,
  ConfirmDialog,
  Modal,
  Pagination,
  sessionsApi,
  classErrorMessage,
  type SessionView,
} from "@/modules/admin";
import { teacherClassesApi } from "../api/teacher-classes.api";
import { Menu, type MenuItem } from "@/shared/components/ui";
import { toast } from "@/shared/components/ui/Toast/toast-store";
import { ClassSessionList } from "./ClassSessionList";
import { TeacherSessionDetail } from "./TeacherSessionDetail";
import { TeacherSessionForm } from "./TeacherSessionForm";
import styles from "./TeacherClassSessions.module.css";

const STUDENTS_PAGE_SIZE = 20;
const formatEnrollmentDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));

export function TeacherClassSessions({
  classId,
  classStatus,
  defaultRoomId,
  header,
}: {
  classId: string;
  classStatus: string;
  defaultRoomId: string | null;
  header?: ReactNode;
}) {
  const teacher = useCurrentUser();
  const teacherName = teacher?.fullName ?? "Giáo viên phụ trách";
  const client = useQueryClient();
  const [editing, setEditing] = useState<SessionView | "new" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sessions" | "students">("sessions");
  const [studentsPage, setStudentsPage] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [roomChoices, setRoomChoices] = useState<{ id: string; name: string }[]>([]);
  const [now] = useState(() => Date.now());
  const students = useQuery({
    queryKey: ["teacher", "class-students", classId, studentsPage],
    queryFn: ({ signal }) =>
      teacherClassesApi.students(classId, studentsPage, STUDENTS_PAGE_SIZE, signal),
    enabled: activeTab === "students",
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["teacher", "class-sessions", classId] });
    await client.invalidateQueries({ queryKey: ["teacher", "session"] });
    await client.invalidateQueries({ queryKey: ["class-session-meet"] });
  };
  const cancel = useMutation({
    mutationFn: () => sessionsApi.cancel(cancelId!, reason.trim()),
    onSuccess: async () => {
      setCancelId(null);
      setReason("");
      setError("");
      await refresh();
      toast.success("Đã hủy buổi học.");
    },
    onError: (cause) => {
      setError(classErrorMessage(cause));
      void refresh();
    },
  });
  const complete = useMutation({
    mutationFn: () => sessionsApi.complete(completeId!),
    onSuccess: async () => {
      setCompleteId(null);
      setError("");
      await refresh();
      toast.success("Đã hoàn thành buổi học.");
    },
    onError: (cause) => {
      setError(classErrorMessage(cause));
      void refresh();
    },
  });
  const canManage = classStatus === "Active";
  const select = (session: SessionView) => {
    setSelectedId(session.id);
    if (session.roomId)
      setRoomChoices((current) =>
        current.some((room) => room.id === session.roomId)
          ? current
          : [...current, { id: session.roomId!, name: session.roomName ?? "Phòng học" }],
      );
  };
  const openEdit = async (session: SessionView) => {
    setError("");
    try {
      const current = await sessionsApi.get(session.id);
      if (current.status !== "Scheduled") {
        setError("Buổi học không còn ở trạng thái đã lên lịch.");
        await refresh();
        return;
      }
      if (current.roomId)
        setRoomChoices((rooms) =>
          rooms.some((room) => room.id === current.roomId)
            ? rooms
            : [...rooms, { id: current.roomId!, name: current.roomName ?? "Phòng học" }],
        );
      setEditing(current);
    } catch (cause) {
      setError(classErrorMessage(cause));
    }
  };
  const submitCancel = (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hủy.");
      return;
    }
    cancel.mutate();
  };
  const renderSessionActions = (session: SessionView) => {
    if (session.status !== "Scheduled" || session.teacherId !== teacher?.id) return null;

    const items: MenuItem[] = [];
    if (canManage) {
      items.push({
        label: "Điều chỉnh",
        icon: <Pencil size={15} />,
        onSelect: () => void openEdit(session),
      });
    }
    if (Date.parse(session.endAt) <= now) {
      items.push({
        label: "Hoàn thành",
        icon: <CheckCircle2 size={15} />,
        onSelect: () => {
          setError("");
          setCompleteId(session.id);
        },
      });
    }
    items.push({
      label: "Hủy buổi học",
      icon: <XCircle size={15} />,
      tone: "danger",
      onSelect: () => {
        setError("");
        setCancelId(session.id);
      },
    });

    return items.length ? (
      <Menu
        portal
        label={`Thao tác buổi học ${session.title}`}
        items={items}
        icon={<MoreVertical size={16} />}
        variant="outline"
        size="md"
      />
    ) : null;
  };
  const tabList = (
    <div className={styles.tabs} role="tablist" aria-label="Nội dung lớp học">
      <button
        type="button"
        role="tab"
        id="class-sessions-tab"
        aria-selected={activeTab === "sessions"}
        aria-controls="class-sessions-panel"
        data-active={activeTab === "sessions" || undefined}
        onClick={() => setActiveTab("sessions")}
      >
        <CalendarDays size={16} /> Buổi học
      </button>
      <button
        type="button"
        role="tab"
        id="class-students-tab"
        aria-selected={activeTab === "students"}
        aria-controls="class-students-panel"
        data-active={activeTab === "students" || undefined}
        onClick={() => {
          setStudentsPage(1);
          setActiveTab("students");
        }}
      >
        <Users size={16} /> Học viên
      </button>
    </div>
  );
  const sessionToolbar = (
    <div className={styles.tabToolbar}>
      {canManage && (
        <Button
          variant="primary"
          icon={<Plus size={15} />}
          onClick={() => {
            setError("");
            setEditing("new");
          }}
        >
          Thêm buổi học
        </Button>
      )}
      {tabList}
    </div>
  );
  const studentErrorStatus = (students.error as { response?: { status?: number } } | null)?.response
    ?.status;
  return (
    <>
      <div className={styles.mainColumn}>
        {header}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {activeTab === "sessions" ? (
          <div role="tabpanel" id="class-sessions-panel" aria-labelledby="class-sessions-tab">
            <ClassSessionList
              key={classId}
              classId={classId}
              audience="teacher"
              teacherId={teacher?.id}
              teacherName={teacherName}
              variant="cards"
              selectedId={selectedId}
              searchable
              toolbarAction={sessionToolbar}
              onSelect={select}
              renderActions={renderSessionActions}
            />
          </div>
        ) : (
          <>
            <div className={styles.studentTabToolbar}>{tabList}</div>
            <section
              className={styles.studentPanel}
              role="tabpanel"
              id="class-students-panel"
              aria-labelledby="class-students-tab"
            >
              <div className={styles.studentHeading}>
                <h3>Học viên đang ghi danh</h3>
                {students.data && <span>{students.data.totalCount} học viên</span>}
              </div>
              {students.isPending ? (
                <p className={styles.studentState}>Đang tải danh sách học viên...</p>
              ) : students.isError ? (
                <div className={styles.studentState} role="alert">
                  <p>
                    {studentErrorStatus === 403
                      ? "Bạn không được phân công dạy lớp này nên không thể xem danh sách học viên."
                      : "Không thể tải danh sách học viên."}
                  </p>
                  <Button onClick={() => void students.refetch()}>Thử lại</Button>
                </div>
              ) : students.data.items.length === 0 ? (
                <p className={styles.studentState}>Lớp hiện chưa có học viên đang ghi danh.</p>
              ) : (
                <>
                  <div className={styles.studentTableWrap}>
                    <table className={styles.studentTable}>
                      <thead>
                        <tr>
                          <th>Học viên</th>
                          <th>Email</th>
                          <th>Ngày ghi danh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.data.items.map((student) => (
                          <tr key={student.id}>
                            <td>{student.studentName?.trim() || "Chưa có tên"}</td>
                            <td>{student.studentEmail?.trim() || "Chưa có email"}</td>
                            <td>{formatEnrollmentDate(student.enrolledAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    page={students.data.page}
                    pages={Math.max(
                      1,
                      Math.ceil(students.data.totalCount / students.data.pageSize),
                    )}
                    total={students.data.totalCount}
                    pageSize={students.data.pageSize}
                    onChange={setStudentsPage}
                  />
                </>
              )}
            </section>
          </>
        )}
      </div>
      {selectedId && (
        <TeacherSessionDetail
          key={selectedId}
          sessionId={selectedId}
          teacherId={teacher?.id}
          teacherName={teacherName}
          canManage={canManage}
          now={now}
          onEdit={(session) => void openEdit(session)}
          onCancel={(session) => {
            setError("");
            setCancelId(session.id);
          }}
          onComplete={(session) => {
            setError("");
            setCompleteId(session.id);
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
      {editing && teacher && (
        <TeacherSessionForm
          key={editing === "new" ? "new" : editing.id}
          classId={classId}
          teacherId={teacher.id}
          defaultRoomId={defaultRoomId}
          roomChoices={roomChoices}
          session={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
            toast.success("Đã lưu buổi học.");
          }}
          onConflict={(message) => {
            setEditing(null);
            setError(message);
            void refresh();
          }}
        />
      )}
      {cancelId && (
        <Modal
          open
          title="Hủy buổi học"
          onClose={() => setCancelId(null)}
          busy={cancel.isPending}
          footer={
            <>
              <Button onClick={() => setCancelId(null)} disabled={cancel.isPending}>
                Đóng
              </Button>
              <Button
                type="submit"
                form="teacher-cancel-session"
                variant="danger"
                disabled={cancel.isPending}
              >
                Xác nhận hủy
              </Button>
            </>
          }
        >
          <form id="teacher-cancel-session" onSubmit={submitCancel} className={styles.form}>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <label>
              Lý do hủy *
              <input
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={Boolean(completeId)}
        title="Hoàn thành buổi học?"
        description="Buổi học sẽ được đánh dấu Đã hoàn thành. Điểm danh không bắt buộc."
        confirmLabel="Hoàn thành"
        pending={complete.isPending}
        error={error}
        onClose={() => setCompleteId(null)}
        onConfirm={() => complete.mutate()}
      />
    </>
  );
}
