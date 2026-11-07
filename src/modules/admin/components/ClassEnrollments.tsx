import { useMemo, useState, type FormEvent } from "react";
import { FileUp, UserPlus } from "lucide-react";
import { Badge, Button, ConfirmDialog, DataTable, Segmented, type Column } from "./ui";
import { StudentEnrollmentDialog } from "./StudentEnrollmentDialog";
import { EnrollmentImportDialog } from "./EnrollmentImportDialog";
import { useClassEnrollments, useEnrollmentActions } from "../hooks/useClassEnrollments";
import { useTimedMessage } from "../hooks/useTimedMessage";
import type { ClassStatus } from "../types/class.types";
import type { ClassEnrollment, EnrollmentStatus } from "../types/enrollment.types";
import { enrollmentErrorMessage } from "../utils/enrollmentError";
import styles from "./classEnrollments.module.css";

const PAGE_SIZE = 20;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Filter = EnrollmentStatus | "All";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });
const dateText = (value: string | null) => (value ? dateFormatter.format(new Date(value)) : "—");

export function ClassEnrollments({
  classId,
  classStatus,
}: {
  classId: string;
  classStatus: ClassStatus | "Deleted";
}) {
  const canModify = classStatus === "Draft" || classStatus === "Active";
  const [status, setStatus] = useState<Filter>("Active");
  const [page, setPage] = useState(1);
  const [studentInput, setStudentInput] = useState("");
  const [studentId, setStudentId] = useState("");
  const [filterError, setFilterError] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [withdrawing, setWithdrawing] = useState<ClassEnrollment | null>(null);
  const [message, setMessage] = useTimedMessage();
  const filters = {
    status: status === "All" ? undefined : status,
    studentId: studentId || undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const list = useClassEnrollments(classId, filters);
  const actions = useEnrollmentActions(classId);

  const columns = useMemo<Column<ClassEnrollment>[]>(
    () => [
      {
        key: "name",
        header: "Học viên",
        locked: true,
        render: (row) => row.studentName?.trim() || "Chưa có tên",
      },
      {
        key: "email",
        header: "Email",
        render: (row) => row.studentEmail?.trim() || "Chưa có email",
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (row) => (
          <Badge tone={row.status === "Active" ? "green" : "neutral"}>
            {row.status === "Active" ? "Đang tham gia" : "Đã rút"}
          </Badge>
        ),
      },
      {
        key: "enrolledAt",
        header: "Ngày ghi danh",
        nowrap: true,
        render: (row) => dateText(row.enrolledAt),
      },
      {
        key: "withdrawnAt",
        header: "Ngày rút",
        nowrap: true,
        render: (row) => dateText(row.withdrawnAt),
      },
      {
        key: "actions",
        header: "Thao tác",
        nowrap: true,
        render: (row) =>
          canModify && row.status === "Active" ? (
            <Button
              size="sm"
              disabled={
                list.isFetching || actions.bulkEnroll.isPending || actions.withdraw.isPending
              }
              onClick={() => {
                actions.withdraw.reset();
                setWithdrawing(row);
              }}
            >
              Rút khỏi lớp
            </Button>
          ) : (
            <span className={styles.muted}>—</span>
          ),
      },
    ],
    [canModify, list.isFetching, actions.bulkEnroll.isPending, actions.withdraw],
  );

  const applyStudentId = (event: FormEvent) => {
    event.preventDefault();
    const value = studentInput.trim();
    if (value && !GUID.test(value)) {
      setFilterError("Mã học viên không hợp lệ. Vui lòng nhập UUID hoặc để trống.");
      return;
    }
    setFilterError("");
    setPage(1);
    setStudentId(value);
  };

  return (
    <section className={styles.section} aria-label="Quản lý học viên trong lớp">
      <div className={styles.heading}>
        <div>
          <h3>QUẢN LÝ HỌC VIÊN</h3>
          <p>Danh sách ghi danh và lịch sử rút khỏi lớp.</p>
        </div>
        {canModify && (
          <div className={styles.headingActions}>
            <Button
              icon={<FileUp size={16} />}
              disabled={
                actions.bulkEnroll.isPending ||
                actions.withdraw.isPending ||
                actions.importStudents.isPending
              }
              onClick={() => {
                actions.importStudents.reset();
                setImporting(true);
              }}
            >
              Nhập học viên từ tệp
            </Button>
            <Button
              variant="primary"
              icon={<UserPlus size={16} />}
              disabled={
                actions.bulkEnroll.isPending ||
                actions.withdraw.isPending ||
                actions.importStudents.isPending
              }
              onClick={() => {
                actions.bulkEnroll.reset();
                setAdding(true);
              }}
            >
              Thêm học viên
            </Button>
          </div>
        )}
      </div>
      {!canModify && (
        <p className={styles.readOnly}>Lớp hiện chỉ cho phép xem danh sách và lịch sử ghi danh.</p>
      )}
      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
      <div className={styles.filters}>
        <Segmented
          label="Trạng thái ghi danh"
          value={status}
          options={[
            { value: "Active", label: "Đang tham gia" },
            { value: "Withdrawn", label: "Đã rút" },
            { value: "All", label: "Tất cả" },
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
            setMessage("");
          }}
        />
        <form className={styles.studentFilter} onSubmit={applyStudentId}>
          <input
            value={studentInput}
            onChange={(event) => setStudentInput(event.target.value)}
            placeholder="Lọc theo mã học viên (UUID)"
            aria-label="Lọc theo mã học viên"
          />
          <Button type="submit" size="sm">
            Lọc
          </Button>
          {studentId && (
            <Button
              size="sm"
              onClick={() => {
                setStudentInput("");
                setStudentId("");
                setFilterError("");
                setPage(1);
              }}
            >
              Bỏ lọc
            </Button>
          )}
        </form>
      </div>
      {filterError && (
        <p className={styles.messageError} role="alert">
          {filterError}
        </p>
      )}
      <DataTable
        id="class-enrollments"
        label="Ghi danh học viên trong lớp"
        columns={columns}
        rows={list.data?.items}
        getRowId={(row) => row.id}
        loading={list.isPending}
        fetching={list.isFetching}
        error={list.isError ? enrollmentErrorMessage(list.error) : undefined}
        onRetry={() => void list.refetch()}
        emptyTitle={
          status === "Active"
            ? "Chưa có học viên đang tham gia"
            : status === "Withdrawn"
              ? "Chưa có học viên đã rút"
              : "Chưa có lịch sử ghi danh"
        }
        emptyDescription={studentId ? "Thử bỏ bộ lọc mã học viên." : undefined}
        pagination={
          list.data && {
            page,
            pages: Math.ceil(list.data.totalCount / PAGE_SIZE),
            total: list.data.totalCount,
            pageSize: PAGE_SIZE,
            onChange: setPage,
          }
        }
      />
      {adding && canModify && (
        <StudentEnrollmentDialog
          pending={actions.bulkEnroll.isPending}
          error={actions.bulkEnroll.error}
          onClose={() => setAdding(false)}
          onResetError={() => actions.bulkEnroll.reset()}
          onEnroll={async (ids) => {
            if (!canModify || actions.bulkEnroll.isPending)
              throw new Error("Enrollment is not available");
            const result = await actions.bulkEnroll.mutateAsync(ids);
            if (result.enrolledCount > 0) {
              setStatus("Active");
              setPage(1);
              setStudentId("");
              setStudentInput("");
            }
            if (result.failedCount === 0) {
              setMessage(`Đã thêm ${result.enrolledCount} học viên vào lớp.`);
            }
            return result;
          }}
        />
      )}
      {importing && canModify && (
        <EnrollmentImportDialog
          pending={actions.importStudents.isPending}
          error={actions.importStudents.error}
          onClose={() => setImporting(false)}
          onResetError={() => actions.importStudents.reset()}
          onImport={(file) => actions.importStudents.mutateAsync(file)}
        />
      )}
      <ConfirmDialog
        open={canModify && Boolean(withdrawing)}
        title="Rút học viên khỏi lớp"
        description={
          <>
            Rút <strong>{withdrawing?.studentName?.trim() || "học viên này"}</strong> khỏi lớp? Lượt
            ghi danh vẫn được giữ trong lịch sử.
          </>
        }
        confirmLabel="Rút khỏi lớp"
        tone="danger"
        pending={actions.withdraw.isPending}
        error={actions.withdraw.error ? enrollmentErrorMessage(actions.withdraw.error) : null}
        onClose={() => setWithdrawing(null)}
        onConfirm={() => {
          if (!canModify || !withdrawing || actions.withdraw.isPending) return;
          actions.withdraw.mutate(withdrawing.id, {
            onSuccess: () => {
              setWithdrawing(null);
              if (list.data?.items.length === 1 && page > 1) setPage(page - 1);
              setMessage("Đã rút học viên khỏi lớp. Lịch sử ghi danh vẫn được lưu.");
            },
          });
        }}
      />
    </section>
  );
}
