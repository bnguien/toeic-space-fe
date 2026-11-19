import { useMemo, useState } from "react";
import { Button, DataTable, Modal, type Column } from "./ui";
import type { StudentConflictPreview } from "@/shared/types/student-conflicts.types";
import {
  isStudentConflictPreviewError,
  previewStudentConflictsBeforeSave,
} from "@/shared/utils/student-conflicts";
import { StudentConflictWarningDialog } from "@/shared/components/ui";
import { useEligibleStudents } from "../hooks/useClassEnrollments";
import type { BulkEnrollmentResult, StudentOption } from "../types/enrollment.types";
import { enrollmentErrorMessage, enrollmentRowErrorMessage } from "../utils/enrollmentError";
import styles from "./classEnrollments.module.css";

const PAGE_SIZE = 20;
const MAX_SELECTED = 1000;

export function StudentEnrollmentDialog({
  pending,
  error,
  onClose,
  onEnroll,
  onPreviewEnroll,
  onResetError,
}: {
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onEnroll: (studentIds: string[]) => Promise<BulkEnrollmentResult>;
  onPreviewEnroll: (studentIds: string[]) => Promise<StudentConflictPreview>;
  onResetError: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StudentOption[]>([]);
  const [selectionError, setSelectionError] = useState("");
  const [result, setResult] = useState<BulkEnrollmentResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [conflictWarning, setConflictWarning] = useState<{
    preview: StudentConflictPreview;
    proceed: () => Promise<BulkEnrollmentResult>;
  } | null>(null);
  const students = useEligibleStudents(search, page, true);
  const selectedIds = useMemo(() => new Set(selected.map((student) => student.id)), [selected]);
  const visible = students.data?.items ?? [];
  const allVisibleSelected =
    visible.length > 0 && visible.every((student) => selectedIds.has(student.id));
  const busy = pending || previewing || proceeding;

  const toggleStudent = (student: StudentOption) => {
    if (busy || students.isFetching) return;
    setSelectionError("");
    setResult(null);
    onResetError();
    if (selectedIds.has(student.id)) {
      setSelected((current) => current.filter((item) => item.id !== student.id));
    } else if (selected.length >= MAX_SELECTED) {
      setSelectionError("Chỉ được chọn tối đa 1.000 học viên mỗi lần.");
    } else {
      setSelected((current) => [...current, student]);
    }
  };

  const togglePage = () => {
    if (allVisibleSelected) {
      setSelected((current) =>
        current.filter((item) => !visible.some((row) => row.id === item.id)),
      );
    } else {
      const additional = visible.filter((student) => !selectedIds.has(student.id));
      if (selected.length + additional.length > MAX_SELECTED) {
        setSelectionError("Chỉ được chọn tối đa 1.000 học viên mỗi lần.");
        return;
      }
      setSelected((current) => [...current, ...additional]);
    }
    setSelectionError("");
    setResult(null);
    onResetError();
  };

  const columns: Column<StudentOption>[] = [
    {
      key: "select",
      header: "Chọn",
      locked: true,
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          disabled={busy || students.isFetching}
          aria-label={`Chọn ${row.fullName || row.email || row.id}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleStudent(row)}
        />
      ),
    },
    { key: "name", header: "Học viên", render: (row) => row.fullName || "Chưa có tên" },
    { key: "email", header: "Email", render: (row) => row.email || "Chưa có email" },
  ];

  const submit = async () => {
    if (busy || students.isFetching || selected.length === 0) return;
    setResult(null);
    setSelectionError("");
    setPreviewError("");
    onResetError();
    const studentIds = selected.map((student) => student.id);
    setPreviewing(true);
    try {
      const outcome = await previewStudentConflictsBeforeSave(
        () => onPreviewEnroll(studentIds),
        () => enroll(studentIds),
      );
      if (outcome.kind === "warning") {
        setConflictWarning({ preview: outcome.preview, proceed: outcome.proceed });
      }
    } catch (cause) {
      if (isStudentConflictPreviewError(cause)) {
        setPreviewError(
          `Không thể kiểm tra trùng lịch. ${enrollmentErrorMessage(cause.cause)} Chưa thêm học viên; hãy thử lại.`,
        );
      }
    } finally {
      setPreviewing(false);
    }
  };

  const enroll = async (studentIds: string[]) => {
    const response = await onEnroll(studentIds);
    if (response.failedCount === 0) {
      onClose();
      return response;
    }
    setResult(response);
    const succeeded = new Set(
      response.items.filter((item) => item.enrollmentId).map((item) => item.studentId),
    );
    setSelected((current) => current.filter((item) => !succeeded.has(item.id)));
    return response;
  };

  const confirmConflictEnroll = async () => {
    if (!conflictWarning || busy) return;
    setProceeding(true);
    setPreviewError("");
    try {
      await conflictWarning.proceed();
      setConflictWarning(null);
    } catch {
      setConflictWarning(null);
      // Mutation errors are rendered by the parent; failed requests preserve the selection.
    } finally {
      setProceeding(false);
    }
  };

  return (
    <Modal
      open
      wide
      title="Thêm học viên"
      description="Có thể chọn học viên ở nhiều trang; Chọn tất cả chỉ áp dụng cho trang đang xem."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Đóng
          </Button>
          <Button
            variant="primary"
            disabled={!selected.length || busy || students.isFetching}
            onClick={() => void submit()}
          >
            {previewing
              ? "Đang kiểm tra trùng lịch…"
              : pending || proceeding
                ? "Đang thêm…"
                : `Xác nhận thêm (${selected.length})`}
          </Button>
        </>
      }
    >
      <form
        className={styles.studentSearch}
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(draft.trim());
          setPage(1);
        }}
      >
        <input
          type="search"
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tìm theo tên hoặc email học viên"
          aria-label="Tìm học viên"
          maxLength={100}
        />
        <Button type="submit" disabled={students.isFetching || busy}>
          Tìm kiếm
        </Button>
      </form>
      <div className={styles.selectionBar}>
        <span role="status">Đã chọn {selected.length} học viên</span>
        <Button
          size="sm"
          disabled={!visible.length || students.isFetching || busy}
          onClick={togglePage}
        >
          {allVisibleSelected ? "Bỏ chọn trang này" : "Chọn tất cả trang này"}
        </Button>
      </div>
      <DataTable
        id="eligible-students-enrollment"
        label="Học viên đủ điều kiện"
        columns={columns}
        rows={students.data?.items}
        getRowId={(row) => row.id}
        onRowClick={students.isFetching || busy ? undefined : toggleStudent}
        loading={students.isPending}
        fetching={students.isFetching}
        error={students.isError ? enrollmentErrorMessage(students.error) : undefined}
        onRetry={() => void students.refetch()}
        emptyTitle="Không tìm thấy học viên phù hợp"
        emptyDescription="Thử tìm bằng tên hoặc email khác. Chỉ học viên đủ điều kiện mới được hiển thị."
        pagination={
          students.data && {
            page,
            pages: Math.ceil(students.data.totalCount / PAGE_SIZE),
            total: students.data.totalCount,
            pageSize: PAGE_SIZE,
            onChange: setPage,
          }
        }
      />
      {previewError && (
        <p className={styles.messageError} role="alert">
          {previewError}
        </p>
      )}
      {selectionError && (
        <p className={styles.messageError} role="alert">
          {selectionError}
        </p>
      )}
      {Boolean(error) && (
        <p className={styles.messageError} role="alert">
          {enrollmentErrorMessage(error)}
        </p>
      )}
      {result && (
        <div className={styles.importResult}>
          <p
            className={result.enrolledCount ? styles.success : styles.messageError}
            role={result.failedCount ? "alert" : "status"}
          >
            Đã thêm {result.enrolledCount}/{result.totalCount} học viên; {result.failedCount} không
            thành công.
          </p>
          {result.failedCount > 0 && (
            <div className={styles.importFailures}>
              <strong>Học viên chưa ghi danh:</strong>
              <ul>
                {result.items
                  .filter((item) => item.code)
                  .map((item) => (
                    <li key={item.index}>
                      {selected.find((student) => student.id === item.studentId)?.fullName ||
                        `Mã học viên: ${item.studentId}`}
                      : {enrollmentRowErrorMessage(item.code)}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <StudentConflictWarningDialog
        open={Boolean(conflictWarning)}
        affectedStudentCount={conflictWarning?.preview.affectedStudentCount ?? 0}
        conflictCount={conflictWarning?.preview.conflictCount}
        pending={pending || proceeding}
        confirmLabel="Vẫn thêm học viên"
        onBack={() => setConflictWarning(null)}
        onProceed={() => void confirmConflictEnroll()}
      />
    </Modal>
  );
}
