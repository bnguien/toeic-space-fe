import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { DateTimePicker } from "@/shared/components/DatePicker";
import { Select } from "@/shared/components/Select";
import { Modal, Button, classErrorMessage, sessionsApi } from "@/modules/admin";
import type { StudentConflictPreview } from "@/shared/types/student-conflicts.types";
import {
  isStudentConflictPreviewError,
  previewStudentConflictsBeforeSave,
} from "@/shared/utils/student-conflicts";
import { StudentConflictWarningDialog } from "@/shared/components/ui";
import type {
  SessionEdit,
  SessionInput,
  SessionMode,
  SessionType,
  SessionView,
} from "@/modules/admin";
import styles from "./TeacherSessionForm.module.css";

const defaultTitle = (type: SessionType) =>
  type === "Regular" ? "Buổi học chính khóa" : "Buổi học bù";

interface PendingTeacherSessionSave {
  preview: StudentConflictPreview;
  proceed: () => Promise<void>;
}

export function TeacherSessionForm({
  classId,
  teacherId,
  defaultRoomId,
  roomChoices,
  session,
  onClose,
  onSaved,
  onConflict,
}: {
  classId: string;
  teacherId: string;
  defaultRoomId: string | null;
  roomChoices: { id: string; name: string }[];
  session?: SessionView;
  onClose: () => void;
  onSaved: () => void;
  onConflict: (message: string) => void;
}) {
  const [title, setTitle] = useState(
    session?.title ?? defaultTitle(session?.sessionType ?? "Makeup"),
  );
  const [sessionType, setSessionType] = useState<SessionType>(session?.sessionType ?? "Makeup");
  const [startAt, setStartAt] = useState(session?.startAt ?? "");
  const [endAt, setEndAt] = useState(session?.endAt ?? "");
  const [mode, setMode] = useState<SessionMode>(
    session?.mode ?? (defaultRoomId ? "Offline" : "Online"),
  );
  const [roomId, setRoomId] = useState(session?.roomId ?? defaultRoomId ?? "");
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<PendingTeacherSessionSave | null>(null);
  const changeSessionType = (value: SessionType) => {
    setSessionType(value);
    if (session) return;
    const current = title.trim();
    if (!current || current === defaultTitle("Makeup") || current === defaultTitle("Regular")) {
      setTitle(defaultTitle(value));
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (
      !title.trim() ||
      !startAt ||
      !endAt ||
      Date.parse(startAt) >= Date.parse(endAt) ||
      (mode === "Offline" && !roomId && !defaultRoomId) ||
      (session && !reason.trim())
    ) {
      setError("Kiểm tra tiêu đề, thời gian, phòng học và lý do điều chỉnh.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (session) {
        const input: SessionEdit = {
          teacherId,
          title: title.trim(),
          description: session.description,
          startAt,
          endAt,
          mode,
          roomId: mode === "Offline" ? roomId || null : null,
          notes: notes.trim() || null,
          reason: reason.trim(),
          expectedVersion: session.version,
        };
        const outcome = await previewStudentConflictsBeforeSave(
          () => sessionsApi.previewUpdate(session.id, input),
          async () => {
            await sessionsApi.update(session.id, input);
          },
        );
        if (outcome.kind === "warning") {
          setConflictWarning({
            preview: outcome.preview,
            proceed: async () => {
              await outcome.proceed();
            },
          });
          return;
        }
      } else {
        const input: SessionInput = {
          classId,
          teacherId,
          title: title.trim(),
          sessionType,
          startAt,
          endAt,
          mode,
          roomId: mode === "Offline" ? roomId || null : null,
          notes: notes.trim() || null,
        };
        const outcome = await previewStudentConflictsBeforeSave(
          () => sessionsApi.previewCreate(input),
          async () => {
            await sessionsApi.create(input);
          },
        );
        if (outcome.kind === "warning") {
          setConflictWarning({
            preview: outcome.preview,
            proceed: async () => {
              await outcome.proceed();
            },
          });
          return;
        }
      }
      onSaved();
    } catch (cause) {
      const message = isStudentConflictPreviewError(cause)
        ? `Không thể kiểm tra trùng lịch. ${classErrorMessage(cause.cause)} Buổi học chưa được lưu; hãy thử lại.`
        : classErrorMessage(cause);
      if (
        isAxiosError(cause) &&
        (cause.response?.data as { code?: string } | undefined)?.code === "concurrency_conflict"
      ) {
        onConflict(message);
      } else setError(message);
    } finally {
      setBusy(false);
    }
  };
  const confirmConflictSave = async () => {
    if (!conflictWarning || busy) return;
    setBusy(true);
    setError("");
    try {
      await conflictWarning.proceed();
      setConflictWarning(null);
      onSaved();
    } catch (cause) {
      setConflictWarning(null);
      setError(classErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const options = [
    ...(defaultRoomId ? [{ value: "", label: "Phòng mặc định của lớp" }] : []),
    ...roomChoices.map((room) => ({ value: room.id, label: room.name })),
    ...(roomId && roomId !== defaultRoomId && !roomChoices.some((room) => room.id === roomId)
      ? [{ value: roomId, label: session?.roomName ?? "Phòng hiện tại" }]
      : []),
  ];
  return (
    <Modal
      open
      title={session ? "Điều chỉnh buổi học" : "Thêm buổi học"}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" form="teacher-session-form" variant="primary" disabled={busy}>
            {busy ? "Đang kiểm tra / lưu…" : "Lưu buổi học"}
          </Button>
        </>
      }
    >
      <form
        id="teacher-session-form"
        className={styles.form}
        onSubmit={(event) => void submit(event)}
      >
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <label>
          Tiêu đề *
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        {!session && (
          <label>
            Loại buổi học *
            <Select
              value={sessionType}
              options={[
                { value: "Makeup", label: "Buổi học bù" },
                { value: "Regular", label: "Buổi chính khóa bổ sung" },
              ]}
              onChange={(value) => changeSessionType(value as SessionType)}
              aria-label="Loại buổi học"
            />
          </label>
        )}
        <div className={styles.row}>
          <label>
            Bắt đầu *<DateTimePicker value={startAt} onChange={setStartAt} />
          </label>
          <label>
            Kết thúc *<DateTimePicker value={endAt} onChange={setEndAt} />
          </label>
        </div>
        <label>
          Hình thức *
          <Select
            value={mode}
            options={[
              { value: "Offline", label: "Trực tiếp" },
              { value: "Online", label: "Trực tuyến" },
            ]}
            onChange={(value) => setMode(value as SessionMode)}
          />
        </label>
        {mode === "Offline" && (
          <label>
            Phòng học *
            {options.length ? (
              <Select
                value={roomId === defaultRoomId ? "" : roomId}
                options={options}
                onChange={(value) => setRoomId(value)}
              />
            ) : (
              <span>Chưa có phòng khả dụng trong các buổi học đã xem.</span>
            )}
          </label>
        )}
        {session && (
          <label>
            Lý do điều chỉnh *
            <input
              required
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        <label>
          Ghi chú
          <textarea
            maxLength={2000}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </form>
      <StudentConflictWarningDialog
        open={Boolean(conflictWarning)}
        affectedStudentCount={conflictWarning?.preview.affectedStudentCount ?? 0}
        conflictCount={conflictWarning?.preview.conflictCount}
        pending={busy}
        onBack={() => setConflictWarning(null)}
        onProceed={() => void confirmConflictSave()}
      />
    </Modal>
  );
}
