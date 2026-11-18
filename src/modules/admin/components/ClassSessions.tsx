import { useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle,
  Edit3,
  Globe,
  History,
  Plus,
  Video,
  XCircle,
} from "lucide-react";
import { Badge, Button, ConfirmDialog, DataTable, Modal, Pagination, type Column } from "./ui";
import { Select, type SelectOption } from "@/shared/components/Select";
import { DatePicker, DateTimePicker } from "@/shared/components/DatePicker";
import { useClassSessions, useSessionActions, useSessionAudit } from "../hooks/useClassSessions";
import { sessionsApi } from "../api/sessions.api";
import { useRooms } from "../hooks/useFacilities";
import { useTeachers } from "../hooks/useClasses";
import type { ClassStatus } from "../types/class.types";
import type {
  SessionEdit,
  SessionInput,
  SessionMode,
  SessionStatus,
  SessionType,
  SessionView,
} from "../types/schedule.types";
import { classErrorMessage } from "../utils/classErrorMessage";
import type { StudentConflictPreview } from "@/shared/types/student-conflicts.types";
import {
  isStudentConflictPreviewError,
  previewStudentConflictsBeforeSave,
} from "@/shared/utils/student-conflicts";
import { StudentConflictWarningDialog } from "@/shared/components/ui";
import { SessionMeetDialog } from "./SessionMeetDialog";
import styles from "./ClassSessions.module.css";

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const statusTones: Record<SessionStatus, "green" | "blue" | "rose"> = {
  Scheduled: "blue",
  Completed: "green",
  Cancelled: "rose",
};

const statusLabels: Record<SessionStatus, string> = {
  Scheduled: "Đã lên lịch",
  Completed: "Đã hoàn thành",
  Cancelled: "Đã hủy",
};

interface PendingSessionConflictSave {
  preview: StudentConflictPreview;
  action: "create" | "update";
  proceed: () => Promise<void>;
}

export function ClassSessions({
  classId,
  classStatus,
  defaultRoomId,
  classStartDate,
  classEndDate,
  assignedTeacherId,
}: {
  classId: string;
  classStatus: ClassStatus | "Deleted";
  defaultRoomId?: string | null;
  classStartDate?: string | null;
  classEndDate?: string | null;
  assignedTeacherId?: string | null;
}) {
  const canEdit = classStatus === "Draft" || classStatus === "Active";

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    if (classStartDate) return new Date(`${classStartDate}T00:00:00Z`).toISOString();
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  }, [classStartDate]);

  const defaultTo = useMemo(() => {
    if (classEndDate) return new Date(`${classEndDate}T23:59:59Z`).toISOString();
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString();
  }, [classEndDate]);

  const [dateFrom, setDateFrom] = useState(defaultFrom.slice(0, 10));
  const [dateTo, setDateTo] = useState(defaultTo.slice(0, 10));
  const [filterStatus, setFilterStatus] = useState<SessionStatus | "">("");
  const [page, setPage] = useState(1);

  const sessionsQuery = useClassSessions({
    classId,
    status: filterStatus || undefined,
    from: `${dateFrom}T00:00:00Z`,
    to: `${dateTo}T23:59:59Z`,
    page,
    pageSize: 15,
  });

  const teachersQuery = useTeachers("", true);
  const roomsQuery = useRooms({ status: "Active", pageSize: 100 });

  const actions = useSessionActions(classId);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionView | null>(null);
  const [cancellingSession, setCancellingSession] = useState<SessionView | null>(null);
  const [completingSession, setCompletingSession] = useState<SessionView | null>(null);
  const [auditSessionId, setAuditSessionId] = useState<string | null>(null);
  const [meetingSession, setMeetingSession] = useState<SessionView | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [conflictSaving, setConflictSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<PendingSessionConflictSave | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState("");

  const auditQuery = useSessionAudit(auditSessionId);

  // Form states for Create session
  const [createType, setCreateType] = useState<SessionType>("Makeup");
  const [createTitle, setCreateTitle] = useState("");
  const [createTeacherId, setCreateTeacherId] = useState(assignedTeacherId ?? "");
  const [createStartAt, setCreateStartAt] = useState("");
  const [createEndAt, setCreateEndAt] = useState("");
  const [createMode, setCreateMode] = useState<SessionMode>("Offline");
  const [createRoomId, setCreateRoomId] = useState(defaultRoomId ?? "");
  const [createNotes, setCreateNotes] = useState("");

  // Form states for Edit session
  const [editTitle, setEditTitle] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [editMode, setEditMode] = useState<SessionMode>("Offline");
  const [editRoomId, setEditRoomId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editReason, setEditReason] = useState("");

  const teacherOptions: SelectOption<string>[] = (teachersQuery.data?.items ?? []).map((t) => ({
    value: t.id,
    label: `${t.fullName} (${t.email})`,
  }));

  const roomOptions: SelectOption<string>[] = [
    { value: "", label: "Dùng phòng mặc định của lớp" },
    ...(roomsQuery.data?.items ?? []).map((r) => ({
      value: r.id,
      label: `${r.name} · ${r.centerName} (${r.capacity} chỗ)`,
    })),
  ];

  const modeOptions: SelectOption<SessionMode>[] = [
    { value: "Offline", label: "Trực tiếp tại lớp (Offline)" },
    { value: "Online", label: "Trực tuyến qua Google Meet (Online)" },
  ];

  const openCreateModal = () => {
    setError("");
    setCreateType("Makeup");
    setCreateTitle("Buổi học bù");
    setCreateTeacherId(assignedTeacherId ?? teachersQuery.data?.items[0]?.id ?? "");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const endT = new Date(tomorrow);
    endT.setHours(19, 30, 0, 0);
    setCreateStartAt(tomorrow.toISOString());
    setCreateEndAt(endT.toISOString());
    setCreateMode(defaultRoomId ? "Offline" : "Online");
    setCreateRoomId(defaultRoomId ?? "");
    setCreateNotes("");
    setCreateModalOpen(true);
  };

  const openEditModal = (session: SessionView) => {
    setError("");
    setEditTitle(session.title);
    setEditTeacherId(session.teacherId);
    setEditStartAt(session.startAt);
    setEditEndAt(session.endAt);
    setEditMode(session.mode);
    setEditRoomId(session.roomId ?? "");
    setEditNotes(session.notes ?? "");
    setEditReason("");
    setEditingSession(session);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (previewBusy || actions.create.isPending) return;
    setError("");

    if (!createTitle.trim()) {
      setError("Vui lòng nhập tiêu đề buổi học.");
      return;
    }
    if (!createTeacherId) {
      setError("Vui lòng chọn giáo viên phụ trách.");
      return;
    }
    if (!createStartAt || !createEndAt) {
      setError("Vui lòng chọn thời gian bắt đầu và kết thúc.");
      return;
    }
    if (new Date(createStartAt) >= new Date(createEndAt)) {
      setError("Thời gian bắt đầu phải trước thời gian kết thúc.");
      return;
    }
    if (createMode === "Offline" && !createRoomId && !defaultRoomId) {
      setError("Lớp chưa có phòng mặc định, vui lòng chọn phòng học cụ thể.");
      return;
    }

    const payload: SessionInput = {
      classId,
      teacherId: createTeacherId,
      title: createTitle.trim(),
      sessionType: createType,
      startAt: createStartAt,
      endAt: createEndAt,
      mode: createMode,
      roomId: createMode === "Offline" ? createRoomId || null : null,
      notes: createNotes.trim() || null,
    };

    try {
      setPreviewBusy(true);
      const outcome = await previewStudentConflictsBeforeSave(
        () => sessionsApi.previewCreate(payload),
        async () => {
          await actions.create.mutateAsync(payload);
        },
      );
      if (outcome.kind === "warning") {
        setConflictWarning({
          preview: outcome.preview,
          action: "create",
          proceed: async () => {
            await outcome.proceed();
          },
        });
      } else setCreateModalOpen(false);
    } catch (err) {
      setError(
        isStudentConflictPreviewError(err)
          ? `Không thể kiểm tra trùng lịch. ${classErrorMessage(err.cause)} Buổi học chưa được lưu; hãy thử lại.`
          : classErrorMessage(err),
      );
    } finally {
      setPreviewBusy(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSession || previewBusy || actions.update.isPending) return;
    setError("");

    if (!editReason.trim()) {
      setError("Vui lòng nhập lý do điều chỉnh buổi học (bắt buộc).");
      return;
    }
    if (!editTitle.trim()) {
      setError("Vui lòng nhập tiêu đề buổi học.");
      return;
    }
    if (!editTeacherId) {
      setError("Vui lòng chọn giáo viên phụ trách.");
      return;
    }
    if (new Date(editStartAt) >= new Date(editEndAt)) {
      setError("Thời gian bắt đầu phải trước thời gian kết thúc.");
      return;
    }

    const payload: SessionEdit = {
      teacherId: editTeacherId,
      title: editTitle.trim(),
      startAt: editStartAt,
      endAt: editEndAt,
      mode: editMode,
      roomId: editMode === "Offline" ? editRoomId || null : null,
      notes: editNotes.trim() || null,
      reason: editReason.trim(),
      expectedVersion: editingSession.version,
    };

    try {
      setPreviewBusy(true);
      const outcome = await previewStudentConflictsBeforeSave(
        () => sessionsApi.previewUpdate(editingSession.id, payload),
        async () => {
          await actions.update.mutateAsync({ id: editingSession.id, input: payload });
        },
      );
      if (outcome.kind === "warning") {
        setConflictWarning({
          preview: outcome.preview,
          action: "update",
          proceed: async () => {
            await outcome.proceed();
          },
        });
      } else setEditingSession(null);
    } catch (err) {
      setError(
        isStudentConflictPreviewError(err)
          ? `Không thể kiểm tra trùng lịch. ${classErrorMessage(err.cause)} Thay đổi chưa được lưu; hãy thử lại.`
          : classErrorMessage(err),
      );
    } finally {
      setPreviewBusy(false);
    }
  };

  const confirmStudentConflictSave = async () => {
    if (!conflictWarning || conflictSaving) return;
    setConflictSaving(true);
    setError("");
    try {
      await conflictWarning.proceed();
      if (conflictWarning.action === "create") setCreateModalOpen(false);
      else setEditingSession(null);
      setConflictWarning(null);
    } catch (err) {
      setConflictWarning(null);
      setError(classErrorMessage(err));
    } finally {
      setConflictSaving(false);
    }
  };

  const handleCancelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cancellingSession) return;
    setError("");

    if (!cancelReason.trim()) {
      setError("Vui lòng nhập lý do hủy buổi học.");
      return;
    }

    try {
      await actions.cancel.mutateAsync({
        id: cancellingSession.id,
        reason: cancelReason.trim(),
      });
      setCancellingSession(null);
    } catch (err) {
      setError(classErrorMessage(err));
    }
  };

  const handleCompleteSubmit = async () => {
    if (!completingSession) return;
    setError("");
    try {
      await actions.complete.mutateAsync(completingSession.id);
      setCompletingSession(null);
    } catch (err) {
      setError(classErrorMessage(err));
    }
  };

  const columns = useMemo<Column<SessionView>[]>(
    () => [
      {
        key: "title",
        header: "Buổi học",
        locked: true,
        render: (row) => (
          <div className={styles.sessionTitleCell}>
            <div className={styles.sessionTitle}>
              {row.title}{" "}
              <Badge tone={row.sessionType === "Regular" ? "neutral" : "pearl"}>
                {row.sessionType === "Regular" ? "Chính khóa" : "Học bù"}
              </Badge>
            </div>
            {(row.timeOverridden ||
              row.roomOverridden ||
              row.teacherOverridden ||
              row.modeOverridden) && (
              <div className={styles.overridesList}>
                {row.timeOverridden && <span className={styles.overrideTag}>Dời giờ</span>}
                {row.roomOverridden && <span className={styles.overrideTag}>Đổi phòng</span>}
                {row.teacherOverridden && <span className={styles.overrideTag}>Đổi GV</span>}
                {row.modeOverridden && <span className={styles.overrideTag}>Đổi hình thức</span>}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "time",
        header: "Thời gian",
        nowrap: true,
        render: (row) => (
          <div style={{ fontSize: "0.8rem", color: "#364e65" }}>
            <div>{formatDateTime(row.startAt)}</div>
            <div style={{ color: "#74889b", fontSize: "0.75rem" }}>
              đến{" "}
              {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(
                new Date(row.endAt),
              )}
            </div>
          </div>
        ),
      },
      {
        key: "location",
        header: "Địa điểm / Phòng",
        render: (row) =>
          row.mode === "Online" ? (
            <Badge tone="pearl">
              <Globe size={12} style={{ marginRight: 4, display: "inline" }} />
              Google Meet
            </Badge>
          ) : (
            <div style={{ fontSize: "0.8rem" }}>
              <strong>{row.roomName ?? "Phòng mặc định"}</strong>
              {row.centerName && (
                <div style={{ color: "#7b8f9e", fontSize: "0.72rem" }}>{row.centerName}</div>
              )}
            </div>
          ),
      },
      {
        key: "teacher",
        header: "Giáo viên",
        render: (row) => {
          const teacher = teachersQuery.data?.items.find((t) => t.id === row.teacherId);
          return (
            <div style={{ fontSize: "0.8rem" }}>
              <strong>{teacher?.fullName ?? "Giáo viên"}</strong>
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (row) => <Badge tone={statusTones[row.status]}>{statusLabels[row.status]}</Badge>,
      },
      {
        key: "actions",
        header: "Thao tác",
        nowrap: true,
        render: (row) => {
          const isFinishedTime = new Date(row.endAt) <= now;
          return (
            <div className={styles.actionsCell}>
              {canEdit && row.status === "Scheduled" && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => openEditModal(row)}
                    title="Chỉnh sửa hoặc dời lịch buổi học"
                  >
                    <Edit3 size={13} /> Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setError("");
                      setCancelReason("");
                      setCancellingSession(row);
                    }}
                    title="Hủy buổi học này"
                  >
                    <XCircle size={13} /> Hủy
                  </Button>
                  {isFinishedTime && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setError("");
                        setCompletingSession(row);
                      }}
                      title="Đánh dấu buổi học đã hoàn thành"
                    >
                      <CheckCircle size={13} /> Hoàn thành
                    </Button>
                  )}
                </>
              )}
              {row.mode === "Online" && row.status === "Scheduled" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setMeetingSession(row);
                  }}
                  title="Xem trạng thái phòng Google Meet và thử lại khi cần"
                >
                  <Video size={13} /> Meet
                </Button>
              )}
              <Button
                size="sm"
                variant="default"
                onClick={() => setAuditSessionId(row.id)}
                title="Xem chi tiết và lịch sử thay đổi"
              >
                <History size={13} /> Lịch sử
              </Button>
            </div>
          );
        },
      },
    ],
    [canEdit, now, teachersQuery.data?.items],
  );

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <h3 className={styles.headingTitle}>Danh sách buổi học</h3>
          <p className={styles.headingSubtitle}>
            Theo dõi, điều chỉnh phòng học/giáo viên, dời lịch và quản lý trạng thái từng buổi học.
          </p>
        </div>
        {canEdit && (
          <div className={styles.headingActions}>
            <Button size="sm" variant="primary" onClick={openCreateModal}>
              <Plus size={14} /> Thêm buổi học bù / đột xuất
            </Button>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.toolbarRow}>
        <div className={styles.filterGroup}>
          <div className={styles.dateFilterBox}>
            <CalendarDays size={15} />
            <span>Từ:</span>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Từ ngày" />
            <span>Đến:</span>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="Đến ngày" />
          </div>

          <Select
            value={filterStatus}
            onChange={(v) => {
              setFilterStatus(v as SessionStatus | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "Scheduled", label: "Đã lên lịch" },
              { value: "Completed", label: "Đã hoàn thành" },
              { value: "Cancelled", label: "Đã hủy" },
            ]}
            aria-label="Lọc trạng thái"
          />
        </div>
      </div>

      <DataTable
        id="class-sessions-table"
        label="Danh sách buổi học"
        columns={columns}
        rows={sessionsQuery.data?.items}
        getRowId={(r) => r.id}
        loading={sessionsQuery.isLoading}
        emptyTitle="Không có buổi học nào"
        emptyDescription="Không tìm thấy buổi học nào trong khoảng thời gian đã chọn."
      />

      {sessionsQuery.data && sessionsQuery.data.totalCount > 15 && (
        <Pagination
          page={page}
          pages={Math.ceil(sessionsQuery.data.totalCount / 15)}
          total={sessionsQuery.data.totalCount}
          pageSize={15}
          onChange={setPage}
        />
      )}

      {/* Create Session Modal */}
      {createModalOpen && (
        <Modal
          open={createModalOpen}
          title="Tạo buổi học bù / đột xuất"
          busy={previewBusy || actions.create.isPending}
          onClose={() => setCreateModalOpen(false)}
          footer={
            <>
              <Button
                variant="default"
                onClick={() => setCreateModalOpen(false)}
                disabled={previewBusy || actions.create.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="create-session-form"
                disabled={actions.create.isPending || previewBusy}
              >
                {previewBusy ? "Đang kiểm tra trùng lịch…" : "Tạo buổi học"}
              </Button>
            </>
          }
        >
          <form id="create-session-form" onSubmit={handleCreateSubmit} className={styles.formGrid}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Loại buổi học *</span>
                <Select
                  value={createType}
                  onChange={(v) => setCreateType(v as SessionType)}
                  options={[
                    { value: "Makeup", label: "Buổi học bù" },
                    { value: "Regular", label: "Buổi chính khóa bổ sung" },
                  ]}
                  aria-label="Loại buổi học"
                />
              </div>

              <div className={styles.formField}>
                <span className={styles.formLabel}>Hình thức học *</span>
                <Select
                  value={createMode}
                  onChange={(v) => setCreateMode(v as SessionMode)}
                  options={modeOptions}
                  aria-label="Hình thức học"
                />
              </div>
            </div>

            <label className={styles.formField}>
              <span className={styles.formLabel}>Tiêu đề buổi học *</span>
              <input
                className={styles.formControl}
                required
                maxLength={200}
                placeholder="Ví dụ: Buổi bù Unit 3 - Listening"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </label>

            <div className={styles.formField}>
              <span className={styles.formLabel}>Giáo viên giảng dạy *</span>
              <Select
                value={createTeacherId}
                onChange={setCreateTeacherId}
                options={teacherOptions}
                aria-label="Giáo viên phụ trách"
              />
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Bắt đầu lúc *</span>
                <DateTimePicker
                  value={createStartAt}
                  onChange={setCreateStartAt}
                  placeholder="Chọn ngày giờ bắt đầu"
                />
              </div>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Kết thúc lúc *</span>
                <DateTimePicker
                  value={createEndAt}
                  onChange={setCreateEndAt}
                  placeholder="Chọn ngày giờ kết thúc"
                />
              </div>
            </div>

            {createMode === "Offline" && (
              <div className={styles.formField}>
                <span className={styles.formLabel}>Phòng học (Offline)</span>
                <Select
                  value={createRoomId}
                  onChange={setCreateRoomId}
                  options={roomOptions}
                  aria-label="Chọn phòng học"
                />
              </div>
            )}

            <label className={styles.formField}>
              <span className={styles.formLabel}>Ghi chú nội bộ</span>
              <textarea
                className={styles.formTextarea}
                rows={2}
                maxLength={2000}
                placeholder="Ghi chú về buổi học (nếu có)"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </label>
          </form>
        </Modal>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <Modal
          open={Boolean(editingSession)}
          title={`Chỉnh sửa buổi học (Version ${editingSession.version})`}
          busy={previewBusy || actions.update.isPending}
          onClose={() => setEditingSession(null)}
          footer={
            <>
              <Button
                variant="default"
                onClick={() => setEditingSession(null)}
                disabled={previewBusy || actions.update.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="edit-session-form"
                disabled={actions.update.isPending || previewBusy}
              >
                {previewBusy ? "Đang kiểm tra trùng lịch…" : "Lưu thay đổi"}
              </Button>
            </>
          }
        >
          <form id="edit-session-form" onSubmit={handleEditSubmit} className={styles.formGrid}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <label className={styles.formField}>
              <span className={styles.formLabel}>Lý do điều chỉnh * (Bắt buộc)</span>
              <input
                className={styles.formControl}
                required
                maxLength={500}
                placeholder="Ví dụ: Giáo viên bận lịch công tác, dời sang 19:30"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
            </label>

            <label className={styles.formField}>
              <span className={styles.formLabel}>Tiêu đề buổi học *</span>
              <input
                className={styles.formControl}
                required
                maxLength={200}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </label>

            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Hình thức học *</span>
                <Select
                  value={editMode}
                  onChange={(v) => setEditMode(v as SessionMode)}
                  options={modeOptions}
                  aria-label="Hình thức học"
                />
              </div>

              <div className={styles.formField}>
                <span className={styles.formLabel}>Giáo viên giảng dạy *</span>
                <Select
                  value={editTeacherId}
                  onChange={setEditTeacherId}
                  options={teacherOptions}
                  aria-label="Giáo viên phụ trách"
                />
              </div>
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Bắt đầu lúc *</span>
                <DateTimePicker
                  value={editStartAt}
                  onChange={setEditStartAt}
                  placeholder="Chọn ngày giờ bắt đầu"
                />
              </div>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Kết thúc lúc *</span>
                <DateTimePicker
                  value={editEndAt}
                  onChange={setEditEndAt}
                  placeholder="Chọn ngày giờ kết thúc"
                />
              </div>
            </div>

            {editMode === "Offline" && (
              <div className={styles.formField}>
                <span className={styles.formLabel}>Phòng học (Offline)</span>
                <Select
                  value={editRoomId}
                  onChange={setEditRoomId}
                  options={roomOptions}
                  aria-label="Chọn phòng học"
                />
              </div>
            )}

            <label className={styles.formField}>
              <span className={styles.formLabel}>Ghi chú buổi học</span>
              <textarea
                className={styles.formTextarea}
                rows={2}
                maxLength={2000}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </label>
          </form>
        </Modal>
      )}

      {/* Cancel Session Modal */}
      {cancellingSession && (
        <Modal
          open={Boolean(cancellingSession)}
          title={`Hủy buổi học: ${cancellingSession.title}`}
          onClose={() => setCancellingSession(null)}
          footer={
            <>
              <Button variant="default" onClick={() => setCancellingSession(null)}>
                Đóng
              </Button>
              <Button
                variant="danger"
                type="submit"
                form="cancel-session-form"
                disabled={actions.cancel.isPending}
              >
                Xác nhận hủy buổi
              </Button>
            </>
          }
        >
          <form id="cancel-session-form" onSubmit={handleCancelSubmit} className={styles.formGrid}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <p style={{ fontSize: "0.84rem", color: "#4f6274" }}>
              Buổi học vào ngày <strong>{formatDateTime(cancellingSession.startAt)}</strong> sẽ được
              chuyển sang trạng thái <strong>Đã hủy</strong>.
            </p>

            <label className={styles.formField}>
              <span className={styles.formLabel}>Lý do hủy buổi học * (Bắt buộc)</span>
              <input
                className={styles.formControl}
                required
                maxLength={500}
                placeholder="Ví dụ: Giảng viên bị ốm đột xuất, sẽ sắp xếp học bù"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </label>
          </form>
        </Modal>
      )}

      {/* Complete Session Confirmation */}
      {completingSession && (
        <ConfirmDialog
          open={Boolean(completingSession)}
          title={`Hoàn thành buổi học: ${completingSession.title}?`}
          description={`Buổi học diễn ra lúc ${formatDateTime(completingSession.startAt)} sẽ được chuyển sang trạng thái Đã hoàn thành.`}
          confirmLabel="Đánh dấu hoàn thành"
          tone="default"
          onClose={() => setCompletingSession(null)}
          onConfirm={handleCompleteSubmit}
          pending={actions.complete.isPending}
        />
      )}

      {meetingSession && (
        <SessionMeetDialog session={meetingSession} onClose={() => setMeetingSession(null)} />
      )}

      {/* Session Audit Modal */}
      {auditSessionId && (
        <Modal
          open={Boolean(auditSessionId)}
          title="Lịch sử thay đổi buổi học"
          onClose={() => setAuditSessionId(null)}
          footer={
            <Button variant="default" onClick={() => setAuditSessionId(null)}>
              Đóng
            </Button>
          }
        >
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {auditQuery.isLoading ? (
              <p style={{ color: "#748698", fontSize: "0.85rem" }}>Đang tải nhật ký kiểm toán...</p>
            ) : auditQuery.data?.length === 0 ? (
              <p style={{ color: "#748698", fontSize: "0.85rem" }}>Chưa có thay đổi nào.</p>
            ) : (
              auditQuery.data?.map((audit) => (
                <div key={audit.id} className={styles.auditItem}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#4e8cae",
                      marginTop: 4,
                    }}
                  />
                  <div>
                    <div>
                      <strong>Hành động: {audit.action}</strong>
                      {" · "}
                      <small style={{ color: "#798c9e" }}>{formatDateTime(audit.changedAt)}</small>
                    </div>
                    {audit.reason && (
                      <div style={{ fontSize: "0.78rem", color: "#607487", marginTop: 2 }}>
                        Lý do: &quot;{audit.reason}&quot;
                      </div>
                    )}
                    {audit.previousValue && (
                      <pre
                        style={{
                          fontSize: "0.72rem",
                          background: "#f4f7f9",
                          padding: 6,
                          borderRadius: 4,
                          marginTop: 4,
                        }}
                      >
                        Cũ: {audit.previousValue}
                      </pre>
                    )}
                    {audit.newValue && (
                      <pre
                        style={{
                          fontSize: "0.72rem",
                          background: "#e8f4fb",
                          padding: 6,
                          borderRadius: 4,
                          marginTop: 4,
                        }}
                      >
                        Mới: {audit.newValue}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      <StudentConflictWarningDialog
        open={Boolean(conflictWarning)}
        affectedStudentCount={conflictWarning?.preview.affectedStudentCount ?? 0}
        conflictCount={conflictWarning?.preview.conflictCount}
        pending={conflictSaving}
        onBack={() => setConflictWarning(null)}
        onProceed={() => void confirmStudentConflictSave()}
      />
    </section>
  );
}
