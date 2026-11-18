import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Clock,
  DoorOpen,
  Edit3,
  Globe,
  History,
  Play,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Badge, Button, Modal } from "./ui";
import { Select, type SelectOption } from "@/shared/components/Select";
import { DatePicker } from "@/shared/components/DatePicker";
import {
  useClassSchedules,
  useScheduleActions,
  useScheduleAudit,
} from "../hooks/useClassSchedules";
import { schedulesApi } from "../api/schedules.api";
import { useRoom } from "../hooks/useFacilities";
import { useTeachers } from "../hooks/useClasses";
import type { ClassStatus } from "../types/class.types";
import type {
  ClassSchedule,
  GenerateSessionsInput,
  ScheduleInput,
  SessionMode,
  SessionOperationResult,
} from "../types/schedule.types";
import { classErrorMessage } from "../utils/classErrorMessage";
import type { StudentConflictPreview } from "@/shared/types/student-conflicts.types";
import {
  isStudentConflictPreviewError,
  previewStudentConflictsBeforeSave,
} from "@/shared/utils/student-conflicts";
import { StudentConflictWarningDialog } from "@/shared/components/ui";
import styles from "./ClassSchedules.module.css";

const DAY_LABELS: Record<number, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  0: "Chủ nhật",
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(`${iso}T00:00:00`));

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );

interface PendingScheduleConflictSave {
  preview: StudentConflictPreview;
  action: "schedule" | "generate";
  proceed: () => Promise<unknown>;
}

export function ClassSchedules({
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

  const schedulesQuery = useClassSchedules(classId);
  const defaultRoomQuery = useRoom(defaultRoomId ?? null);
  const teachersQuery = useTeachers("", true);

  const actions = useScheduleActions(classId);

  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | "new" | null>(null);
  const [auditScheduleId, setAuditScheduleId] = useState<string | null>(null);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false);

  const [generateResult, setGenerateResult] = useState<SessionOperationResult | null>(null);
  const [cancelResult, setCancelResult] = useState<SessionOperationResult | null>(null);

  const [error, setError] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [conflictSaving, setConflictSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<PendingScheduleConflictSave | null>(null);

  const auditQuery = useScheduleAudit(classId, auditScheduleId);

  // Form states for Create/Edit Schedule
  const [formDays, setFormDays] = useState<number[]>([1, 3, 5]);
  const [formStartTime, setFormStartTime] = useState("18:00");
  const [formEndTime, setFormEndTime] = useState("19:30");
  const [formTeacherId, setFormTeacherId] = useState(assignedTeacherId ?? "");
  const [formMode, setFormMode] = useState<SessionMode>("Offline");
  const [formEffectiveFrom, setFormEffectiveFrom] = useState(classStartDate ?? "");
  const [formEffectiveTo, setFormEffectiveTo] = useState(classEndDate ?? "");

  // Generate sessions modal states
  const [genFrom, setGenFrom] = useState(classStartDate ?? "");
  const [genTo, setGenTo] = useState(classEndDate ?? "");

  // Bulk cancel modal states
  const [cancelFromDate, setCancelFromDate] = useState("");
  const [cancelToDate, setCancelToDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const teacherOptions: SelectOption<string>[] = (teachersQuery.data?.items ?? []).map((t) => ({
    value: t.id,
    label: `${t.fullName} (${t.email})`,
  }));

  const modeOptions: SelectOption<SessionMode>[] = [
    { value: "Offline", label: "Trực tiếp tại lớp (Offline)" },
    { value: "Online", label: "Trực tuyến qua Google Meet (Online)" },
  ];

  const openCreateModal = () => {
    setError("");
    setFormDays([1, 3, 5]);
    setFormStartTime("18:00");
    setFormEndTime("19:30");
    setFormTeacherId(assignedTeacherId ?? teachersQuery.data?.items[0]?.id ?? "");
    setFormMode("Offline");
    setFormEffectiveFrom(classStartDate ?? "");
    setFormEffectiveTo(classEndDate ?? "");
    setEditingSchedule("new");
  };

  const openEditModal = (schedule: ClassSchedule) => {
    setError("");
    setFormDays(schedule.daysOfWeek);
    setFormStartTime(schedule.startTime.slice(0, 5));
    setFormEndTime(schedule.endTime.slice(0, 5));
    setFormTeacherId(schedule.teacherId);
    setFormMode(schedule.mode);
    setFormEffectiveFrom(schedule.effectiveFrom);
    setFormEffectiveTo(schedule.effectiveTo);
    setEditingSchedule(schedule);
  };

  const toggleDay = (day: number) => {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleScheduleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (previewBusy || actions.create.isPending || actions.update.isPending) return;
    setError("");

    if (!formDays.length) {
      setError("Vui lòng chọn ít nhất một thứ trong tuần.");
      return;
    }
    if (!formTeacherId) {
      setError("Vui lòng chọn giáo viên phụ trách lịch này.");
      return;
    }
    if (!formEffectiveFrom || !formEffectiveTo) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc hiệu lực.");
      return;
    }
    if (formStartTime >= formEndTime) {
      setError("Giờ bắt đầu phải trước giờ kết thúc.");
      return;
    }
    if (formMode === "Offline" && !defaultRoomId) {
      setError(
        "Lớp chưa có phòng học mặc định. Vui lòng gán phòng mặc định cho lớp trước khi tạo lịch Offline.",
      );
      return;
    }

    const input: ScheduleInput = {
      classId,
      daysOfWeek: formDays,
      startTime: formStartTime.length === 5 ? `${formStartTime}:00` : formStartTime,
      endTime: formEndTime.length === 5 ? `${formEndTime}:00` : formEndTime,
      teacherId: formTeacherId,
      mode: formMode,
      timeZoneId: "Asia/Ho_Chi_Minh",
      effectiveFrom: formEffectiveFrom,
      effectiveTo: formEffectiveTo,
    };

    try {
      setPreviewBusy(true);
      if (editingSchedule === "new") {
        const outcome = await previewStudentConflictsBeforeSave(
          () => schedulesApi.previewCreate(classId, input),
          () => actions.create.mutateAsync(input),
        );
        if (outcome.kind === "warning") {
          setConflictWarning({
            preview: outcome.preview,
            action: "schedule",
            proceed: async () => outcome.proceed(),
          });
          return;
        }
      } else if (editingSchedule) {
        const expectedVersion = editingSchedule.version;
        const outcome = await previewStudentConflictsBeforeSave(
          () => schedulesApi.previewUpdate(classId, editingSchedule.id, input, expectedVersion),
          () => actions.update.mutateAsync({ id: editingSchedule.id, input, expectedVersion }),
        );
        if (outcome.kind === "warning") {
          setConflictWarning({
            preview: outcome.preview,
            action: "schedule",
            proceed: async () => outcome.proceed(),
          });
          return;
        }
      }
      setEditingSchedule(null);
    } catch (err) {
      setError(
        isStudentConflictPreviewError(err)
          ? `Không thể kiểm tra trùng lịch. ${classErrorMessage(err.cause)} Lịch định kỳ chưa được lưu; hãy thử lại.`
          : classErrorMessage(err),
      );
    } finally {
      setPreviewBusy(false);
    }
  };

  const handleGenerateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (previewBusy || actions.generate.isPending) return;
    setError("");
    setGenerateResult(null);

    if (!genFrom || !genTo) {
      setError("Vui lòng chọn khoảng ngày tạo buổi học.");
      return;
    }

    try {
      setPreviewBusy(true);
      const payload: GenerateSessionsInput = { from: genFrom, to: genTo };
      const outcome = await previewStudentConflictsBeforeSave(
        () => schedulesApi.previewGenerate(classId, payload),
        () => actions.generate.mutateAsync(payload),
      );
      if (outcome.kind === "warning") {
        setConflictWarning({
          preview: outcome.preview,
          action: "generate",
          proceed: async () => outcome.proceed(),
        });
      } else setGenerateResult(outcome.result);
    } catch (err) {
      setError(
        isStudentConflictPreviewError(err)
          ? `Không thể kiểm tra trùng lịch. ${classErrorMessage(err.cause)} Chưa tạo buổi học; hãy thử lại.`
          : classErrorMessage(err),
      );
    } finally {
      setPreviewBusy(false);
    }
  };

  const confirmConflictSave = async () => {
    if (!conflictWarning || conflictSaving) return;
    setConflictSaving(true);
    setError("");
    try {
      const result = await conflictWarning.proceed();
      if (conflictWarning.action === "schedule") setEditingSchedule(null);
      else setGenerateResult(result as SessionOperationResult);
      setConflictWarning(null);
    } catch (err) {
      setConflictWarning(null);
      setError(classErrorMessage(err));
    } finally {
      setConflictSaving(false);
    }
  };

  const handleBulkCancelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setCancelResult(null);

    if (!cancelFromDate || !cancelToDate) {
      setError("Vui lòng chọn khoảng thời gian hủy buổi học.");
      return;
    }
    if (!cancelReason.trim()) {
      setError("Vui lòng nhập lý do hủy các buổi học.");
      return;
    }

    try {
      const fromIso = new Date(`${cancelFromDate}T00:00:00Z`).toISOString();
      const toIso = new Date(`${cancelToDate}T23:59:59Z`).toISOString();
      const res = await actions.bulkCancel.mutateAsync({
        from: fromIso,
        to: toIso,
        reason: cancelReason.trim(),
      });
      setCancelResult(res);
    } catch (err) {
      setError(classErrorMessage(err));
    }
  };

  const schedules = schedulesQuery.data ?? [];

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <h3 className={styles.headingTitle}>Lịch học định kỳ hàng tuần</h3>
          <p className={styles.headingSubtitle}>
            Cấu hình thời khóa biểu định kỳ và tự động sinh các buổi học theo chu kỳ.
          </p>
        </div>
        {canEdit && (
          <div className={styles.headingActions}>
            <Button size="sm" variant="default" onClick={() => setShowGenerateModal(true)}>
              <Play size={14} /> Sinh buổi học tự động
            </Button>
            <Button size="sm" variant="default" onClick={() => setShowBulkCancelModal(true)}>
              <Trash2 size={14} /> Hủy buổi hàng loạt
            </Button>
            <Button size="sm" variant="primary" onClick={openCreateModal}>
              <Plus size={14} /> Thêm lịch định kỳ
            </Button>
          </div>
        )}
      </div>

      {schedulesQuery.isLoading ? (
        <p style={{ color: "#748698", fontSize: "0.85rem" }}>Đang tải lịch học...</p>
      ) : schedules.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={28} />
          <strong>Chưa có lịch học định kỳ nào được thiết lập.</strong>
          <span>Tạo lịch định kỳ để hệ thống tự động sinh các buổi học cho lớp.</span>
          {canEdit && (
            <Button size="sm" variant="primary" onClick={openCreateModal} style={{ marginTop: 8 }}>
              <Plus size={14} /> Thêm lịch đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.scheduleGrid}>
          {schedules.map((schedule) => {
            const teacherName =
              teachersQuery.data?.items.find((t) => t.id === schedule.teacherId)?.fullName ??
              "Chưa xác định";

            return (
              <div key={schedule.id} className={styles.scheduleCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.daysList}>
                    {schedule.daysOfWeek.map((day) => (
                      <span key={day} className={styles.dayPill}>
                        {DAY_LABELS[day] ?? day}
                      </span>
                    ))}
                  </div>
                  <Badge tone={schedule.mode === "Offline" ? "blue" : "pearl"}>
                    {schedule.mode === "Offline" ? "Trực tiếp" : "Trực tuyến"}
                  </Badge>
                </div>

                <div className={styles.timeRow}>
                  <Clock size={18} />
                  <span>
                    {schedule.startTime.slice(0, 5)} – {schedule.endTime.slice(0, 5)}
                  </span>
                </div>

                <div className={styles.metaList}>
                  <div className={styles.metaItem}>
                    <User size={14} />
                    <span>
                      Giáo viên: <strong>{teacherName}</strong>
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <CalendarDays size={14} />
                    <span>
                      Hiệu lực: {formatDate(schedule.effectiveFrom)} –{" "}
                      {formatDate(schedule.effectiveTo)}
                    </span>
                  </div>
                  {schedule.mode === "Offline" && (
                    <div className={styles.metaItem}>
                      <DoorOpen size={14} />
                      <span>
                        Phòng:{" "}
                        <strong>{defaultRoomQuery.data?.name ?? "Theo phòng mặc định"}</strong>
                      </span>
                    </div>
                  )}
                  {schedule.mode === "Online" && (
                    <div className={styles.metaItem}>
                      <Globe size={14} />
                      <span>Google Meet tích hợp tự động</span>
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className={styles.cardActions}>
                    <Button size="sm" variant="default" onClick={() => openEditModal(schedule)}>
                      <Edit3 size={13} /> Sửa lịch
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setAuditScheduleId(schedule.id)}
                    >
                      <History size={13} /> Lịch sử
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Form Modal (Create / Edit) */}
      {editingSchedule && (
        <Modal
          open={Boolean(editingSchedule)}
          title={
            editingSchedule === "new" ? "Thêm lịch học định kỳ mới" : "Chỉnh sửa lịch học định kỳ"
          }
          busy={previewBusy || actions.create.isPending || actions.update.isPending}
          onClose={() => setEditingSchedule(null)}
          footer={
            <>
              <Button
                variant="default"
                onClick={() => setEditingSchedule(null)}
                disabled={previewBusy}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="schedule-form"
                disabled={actions.create.isPending || actions.update.isPending || previewBusy}
              >
                {previewBusy
                  ? "Đang kiểm tra trùng lịch…"
                  : editingSchedule === "new"
                    ? "Lưu lịch học"
                    : `Cập nhật (Version ${editingSchedule.version})`}
              </Button>
            </>
          }
        >
          <form id="schedule-form" onSubmit={handleScheduleSubmit} className={styles.formGrid}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.formField}>
              <span className={styles.formLabel}>Các thứ trong tuần *</span>
              <div className={styles.weekdaySelector}>
                {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`${styles.weekdayButton} ${formDays.includes(day) ? styles.weekdayButtonSelected : ""}`}
                    onClick={() => toggleDay(day)}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formRow2}>
              <label className={styles.formField}>
                <span className={styles.formLabel}>Giờ bắt đầu (HH:mm) *</span>
                <input
                  type="time"
                  className={styles.formControl}
                  required
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </label>

              <label className={styles.formField}>
                <span className={styles.formLabel}>Giờ kết thúc (HH:mm) *</span>
                <input
                  type="time"
                  className={styles.formControl}
                  required
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </label>
            </div>

            <div className={styles.formField}>
              <span className={styles.formLabel}>Hình thức học *</span>
              <Select
                value={formMode}
                onChange={(v) => setFormMode(v as SessionMode)}
                options={modeOptions}
                aria-label="Hình thức học"
              />
              {formMode === "Offline" && (
                <small style={{ color: "#597188", fontSize: "0.78rem", marginTop: 4 }}>
                  {defaultRoomId
                    ? `Buổi học sẽ sử dụng phòng mặc định: ${defaultRoomQuery.data?.name ?? defaultRoomId}`
                    : "Lưu ý: Lớp chưa có phòng mặc định. Bạn cần gán phòng học mặc định trước."}
                </small>
              )}
            </div>

            <div className={styles.formField}>
              <span className={styles.formLabel}>Giáo viên phụ trách *</span>
              <Select
                value={formTeacherId}
                onChange={setFormTeacherId}
                options={teacherOptions}
                aria-label="Giáo viên phụ trách"
              />
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Hiệu lực từ ngày *</span>
                <DatePicker
                  value={formEffectiveFrom}
                  onChange={setFormEffectiveFrom}
                  min={classStartDate ?? undefined}
                  max={classEndDate ?? undefined}
                  placeholder="Từ ngày"
                />
              </div>

              <div className={styles.formField}>
                <span className={styles.formLabel}>Đến ngày *</span>
                <DatePicker
                  value={formEffectiveTo}
                  onChange={setFormEffectiveTo}
                  min={formEffectiveFrom || (classStartDate ?? undefined)}
                  max={classEndDate ?? undefined}
                  placeholder="Đến ngày"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Generate Sessions Modal */}
      {showGenerateModal && (
        <Modal
          open={showGenerateModal}
          title="Tạo buổi học tự động từ lịch định kỳ"
          busy={previewBusy || actions.generate.isPending}
          onClose={() => {
            setShowGenerateModal(false);
            setGenerateResult(null);
          }}
          footer={
            <>
              <Button
                variant="default"
                disabled={previewBusy || actions.generate.isPending}
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenerateResult(null);
                }}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="generate-form"
                disabled={actions.generate.isPending || previewBusy}
              >
                {previewBusy ? "Đang kiểm tra trùng lịch…" : "Bắt đầu tạo"}
              </Button>
            </>
          }
        >
          <form id="generate-form" onSubmit={handleGenerateSubmit} className={styles.formGrid}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <p style={{ fontSize: "0.84rem", color: "#4f6274" }}>
              Hệ thống sẽ quét các lịch định kỳ hiện có và tự động sinh các buổi học trong khoảng
              ngày được chọn. Các buổi đã tồn tại hoặc đã hủy trước đó sẽ được tự động bỏ qua để bảo
              đảm toàn vẹn.
            </p>

            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Từ ngày *</span>
                <DatePicker value={genFrom} onChange={setGenFrom} placeholder="Từ ngày" />
              </div>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Đến ngày *</span>
                <DatePicker value={genTo} onChange={setGenTo} placeholder="Đến ngày" />
              </div>
            </div>

            {generateResult && (
              <div className={styles.resultCard}>
                <strong>Kết quả tạo buổi học:</strong>
                <div>Đã tạo thành công: {generateResult.affected.length} buổi học mới.</div>
                {generateResult.skipped.length > 0 && (
                  <div>
                    Số buổi bỏ qua (đã có hoặc trùng lặp): {generateResult.skipped.length}
                    <ul className={styles.skipList}>
                      {generateResult.skipped.slice(0, 5).map((skip, i) => (
                        <li key={i}>{skip.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* Bulk Cancel Sessions Modal */}
      {showBulkCancelModal && (
        <Modal
          open={showBulkCancelModal}
          title="Hủy hàng loạt buổi học theo khoảng ngày"
          onClose={() => {
            setShowBulkCancelModal(false);
            setCancelResult(null);
          }}
          footer={
            <>
              <Button
                variant="default"
                onClick={() => {
                  setShowBulkCancelModal(false);
                  setCancelResult(null);
                }}
              >
                Đóng
              </Button>
              <Button
                variant="danger"
                type="submit"
                form="bulk-cancel-form"
                disabled={actions.bulkCancel.isPending}
              >
                Xác nhận hủy
              </Button>
            </>
          }
        >
          <form id="bulk-cancel-form" onSubmit={handleBulkCancelSubmit} className={styles.formGrid}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.formRow2}>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Từ ngày *</span>
                <DatePicker
                  value={cancelFromDate}
                  onChange={setCancelFromDate}
                  placeholder="Từ ngày"
                />
              </div>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Đến ngày *</span>
                <DatePicker
                  value={cancelToDate}
                  onChange={setCancelToDate}
                  placeholder="Đến ngày"
                />
              </div>
            </div>

            <label className={styles.formField}>
              <span className={styles.formLabel}>Lý do hủy hàng loạt * (Bắt buộc)</span>
              <input
                className={styles.formControl}
                required
                maxLength={500}
                placeholder="Ví dụ: Nghỉ Tết Nguyên Đán / Sự cố thời tiết"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </label>

            {cancelResult && (
              <div
                className={styles.resultCard}
                style={{ background: "#fef3f4", borderColor: "#f9ccd1", color: "#a83542" }}
              >
                <strong>Kết quả:</strong>
                <div>Đã hủy thành công: {cancelResult.affected.length} buổi học.</div>
                {cancelResult.skipped.length > 0 && (
                  <div>
                    Đã bỏ qua: {cancelResult.skipped.length} buổi (đã kết thúc hoặc đã hủy từ
                    trước).
                  </div>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* Schedule Audit History Modal */}
      {auditScheduleId && (
        <Modal
          open={Boolean(auditScheduleId)}
          title="Lịch sử thay đổi lịch học định kỳ"
          onClose={() => setAuditScheduleId(null)}
          footer={
            <Button variant="default" onClick={() => setAuditScheduleId(null)}>
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
        onProceed={() => void confirmConflictSave()}
      />
    </section>
  );
}
