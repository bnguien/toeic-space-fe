import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { ClassActionDialog, type ClassActionConfirmation } from "../components/ClassActionDialog";
import { ClassListTable } from "../components/ClassListTable";
import { ClassEnrollments } from "../components/ClassEnrollments";
import { useCurrentUser } from "@/modules/auth";
import { DatePicker } from "@/shared/components/DatePicker";
import { Select, type SelectOption } from "@/shared/components/Select";
import {
  useClassActions,
  useClassDetail,
  useClasses,
  useHistoryTeachers,
  useTeachers,
} from "../hooks/useClasses";
import type {
  ClassItem,
  ClassStatus,
  CreateClassPayload,
  UpdateClassPayload,
} from "../types/class.types";
import { classErrorMessage } from "../utils/classErrorMessage";
import styles from "./ClassesPage.module.css";

const statusLabel: Record<ClassStatus, string> = {
  Draft: "Bản nháp",
  Active: "Đang hoạt động",
  Completed: "Đã hoàn thành",
  Archived: "Đã lưu trữ",
};

const editableStatus: Record<ClassStatus, ClassStatus[]> = {
  Draft: ["Active"],
  Active: ["Completed"],
  Completed: [],
  Archived: [],
};

const statusOptions: SelectOption<ClassStatus | "">[] = [
  { value: "", label: "Tất cả trạng thái" },
  ...Object.entries(statusLabel).map(([value, label]) => ({
    value: value as ClassStatus,
    label,
  })),
];

const dateText = (value: string | null) =>
  value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "Chưa thiết lập";
const todayIso = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function ClassForm({
  initial,
  onSubmit,
  onClose,
  pending,
}: {
  initial?: ClassItem;
  onSubmit: (payload: CreateClassPayload | UpdateClassPayload) => Promise<void>;
  onClose: () => void;
  pending: boolean;
}) {
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const isNew = !initial;
  const minimumDate = isNew ? todayIso() : undefined;
  const dateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim();
    const startDate = value("startDate") || null;
    const endDate = value("endDate") || null;
    if (dateRangeInvalid) {
      return;
    }
    try {
      await onSubmit(
        isNew
          ? {
              code: value("code"),
              name: value("name"),
              description: value("description") || null,
              startDate,
              endDate,
            }
          : { name: value("name"), description: value("description") || null, startDate, endDate },
      );
      onClose();
    } catch (error) {
      setMessage(classErrorMessage(error));
    }
  };
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <form
        className={styles.modal}
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>
              {isNew ? "THIẾT LẬP LỚP MỚI" : "CẬP NHẬT LỚP HỌC"}
            </span>
            <h2>{isNew ? "Mở lớp học" : initial.name}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className={styles.formGrid}>
          {isNew && (
            <label>
              Mã lớp
              <input name="code" required maxLength={50} placeholder="VD: TOEIC-750-K28" />
            </label>
          )}
          <label className={isNew ? "" : styles.fullWidth}>
            Tên lớp
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={initial?.name}
              placeholder="VD: TOEIC Target 750+ Cấp tốc"
            />
          </label>
          <label>
            Ngày bắt đầu
            <DatePicker
              name="startDate"
              value={startDate}
              onChange={(value) => {
                setStartDate(value);
                setMessage("");
              }}
              min={minimumDate}
              error={dateRangeInvalid}
              aria-describedby={dateRangeInvalid ? "class-date-range-error" : undefined}
            />
          </label>
          <label>
            Ngày kết thúc
            <DatePicker
              name="endDate"
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                setMessage("");
              }}
              min={startDate || minimumDate}
              error={dateRangeInvalid}
              aria-describedby={dateRangeInvalid ? "class-date-range-error" : undefined}
            />
            {dateRangeInvalid && (
              <span id="class-date-range-error" className={styles.fieldError} role="alert">
                Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.
              </span>
            )}
          </label>
          <label className={styles.fullWidth}>
            Mô tả
            <textarea
              name="description"
              maxLength={2000}
              rows={4}
              defaultValue={initial?.description ?? ""}
              placeholder="Mục tiêu, hình thức hoặc ghi chú về lớp học..."
            />
          </label>
        </div>
        {message && <p className={styles.error}>{message}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Hủy
          </button>
          <button className={styles.primaryButton} disabled={pending || dateRangeInvalid}>
            {pending ? "Đang lưu..." : isNew ? "Tạo lớp" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClassesPage({ archived = false }: { archived?: boolean }) {
  const { id: selectedId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const listPath = archived ? "/admin/classes/lifecycle" : "/admin/classes/list";
  const user = useCurrentUser();
  const isAdmin = user?.role === "Admin";
  const [search, setSearch] = useState("");
  const statusParam = searchParams.get("status");
  const status: ClassStatus | "" =
    statusParam && statusParam in statusLabel ? (statusParam as ClassStatus) : "";
  const [page, setPage] = useState(1);
  const [formClass, setFormClass] = useState<ClassItem | "new" | null>(() =>
    searchParams.get("create") === "1" ? "new" : null,
  );
  const [teacherSearch, setTeacherSearch] = useState("");
  const [confirmation, setConfirmation] = useState<ClassActionConfirmation | null>(null);
  const [actionError, setActionError] = useState("");
  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: archived ? ("Archived" as const) : status || undefined,
      page,
      pageSize: 20,
    }),
    [search, status, page, archived],
  );
  const classes = useClasses(filters, !isAdmin);
  const listTeacherIds =
    classes.data?.items.flatMap((item) => (item.teacherId ? [item.teacherId] : [])) ?? [];
  const listTeachers = useHistoryTeachers(listTeacherIds, isAdmin && !selectedId);
  const selected = useClassDetail(selectedId ?? null);
  const teachers = useTeachers(teacherSearch, isAdmin && Boolean(selected.data));
  const historyIds = selected.data
    ? [
        ...selected.data.instructorHistory.map((record) => record.teacherId),
        ...(selected.data.class.teacherId ? [selected.data.class.teacherId] : []),
      ]
    : [];
  const historyTeachers = useHistoryTeachers(historyIds, isAdmin);
  const actions = useClassActions();
  const busy =
    actions.create.isPending ||
    actions.update.isPending ||
    actions.status.isPending ||
    actions.archive.isPending ||
    actions.restore.isPending ||
    actions.remove.isPending ||
    actions.assign.isPending ||
    actions.unassign.isPending;
  const selectedClass = selected.data?.class;

  const submitClass = async (payload: CreateClassPayload | UpdateClassPayload) => {
    if (formClass === "new") await actions.create.mutateAsync(payload as CreateClassPayload);
    else if (formClass)
      await actions.update.mutateAsync({
        id: formClass.id,
        payload: payload as UpdateClassPayload,
      });
  };
  const run = async (operation: () => Promise<unknown>) => {
    setActionError("");
    try {
      await operation();
    } catch (error) {
      setActionError(classErrorMessage(error));
    }
  };
  const runDelete = (id: string) =>
    setConfirmation({
      title: "Xóa lớp học?",
      message: "Lớp sẽ được chuyển vào mục Đã xóa và có thể khôi phục sau.",
      confirmLabel: "Xóa lớp",
      onConfirm: async () => {
        await actions.remove.mutateAsync(id);
        navigate(listPath);
      },
    });
  const confirmAction = async () => {
    if (!confirmation) return;
    const operation = confirmation.onConfirm;
    setConfirmation(null);
    await run(operation);
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
  };

  return (
    <div className={styles.page}>
      {!selectedId && (
        <header className={styles.listHeader}>
          <div>
            <h1>
              {archived ? "Lớp học đã lưu trữ" : isAdmin ? "Danh sách lớp học" : "Các lớp của tôi"}
            </h1>
            <p>
              {archived
                ? "Xem chi tiết, khôi phục hoặc xóa lớp đã lưu trữ."
                : "Tìm lớp học và xem thông tin quản lý."}
            </p>
          </div>
          {isAdmin && !archived && (
            <button className={styles.primaryButton} onClick={() => setFormClass("new")}>
              <Plus size={17} /> Tạo lớp
            </button>
          )}
        </header>
      )}

      {selectedId && (
        <button
          className={styles.backButton}
          onClick={() =>
            navigate(archived ? listPath : `${listPath}${status ? `?status=${status}` : ""}`)
          }
        >
          ← Quay lại danh sách
        </button>
      )}
      {actionError && (
        <p className={styles.actionError} role="alert">
          {actionError}
        </p>
      )}
      <section className={styles.workspaceSingle}>
        {!selectedId && (
          <div className={styles.listPanel}>
            <form className={styles.toolbar} onSubmit={submitSearch}>
              <div className={styles.search}>
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm mã hoặc tên lớp..."
                  aria-label="Tìm mã hoặc tên lớp"
                />
                <button aria-label="Tìm kiếm" disabled={classes.isFetching}>
                  <ChevronRight size={16} />
                </button>
              </div>
              {isAdmin && !archived && (
                <Select
                  value={status}
                  onChange={(value) => {
                    setSearchParams(value ? { status: value } : {});
                    setPage(1);
                  }}
                  options={statusOptions}
                  aria-label="Lọc theo trạng thái"
                  className={styles.toolbarSelect}
                />
              )}
            </form>
            <div className={styles.resultLabel} role="status">
              {classes.isFetching
                ? "Đang cập nhật danh sách..."
                : classes.data
                  ? `${classes.data.totalCount} lớp học`
                  : "Danh sách lớp học"}
            </div>
            {classes.isError ? (
              <p className={styles.notice}>
                Không tải được danh sách lớp.{" "}
                <button onClick={() => void classes.refetch()}>Thử lại</button>
              </p>
            ) : classes.isPending ? (
              <p className={styles.notice} role="status">
                Đang tải danh sách lớp học...
              </p>
            ) : !classes.data?.items.length ? (
              <div className={styles.emptyState}>
                <strong>
                  {search || status
                    ? "Không tìm thấy lớp phù hợp"
                    : archived
                      ? "Chưa có lớp đã lưu trữ"
                      : "Chưa có lớp học"}
                </strong>
                <p>
                  {search || status
                    ? "Thử từ khóa hoặc trạng thái khác."
                    : archived
                      ? "Lớp được lưu trữ sẽ xuất hiện ở đây."
                      : "Tạo lớp đầu tiên để bắt đầu quản lý."}
                </p>
                {!archived && isAdmin && !search && !status && (
                  <button className={styles.primaryButton} onClick={() => setFormClass("new")}>
                    Tạo lớp
                  </button>
                )}
              </div>
            ) : (
              <ClassListTable
                items={classes.data.items}
                basePath={listPath}
                status={archived ? "" : status}
                teacherNames={listTeachers.data}
                teachersPending={listTeachers.isPending}
                isAdmin={isAdmin}
              />
            )}
            {(classes.data?.totalCount ?? 0) > 20 && (
              <div className={styles.pagination}>
                <button
                  aria-label="Trang trước"
                  disabled={page === 1 || classes.isFetching}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Trang {page}</span>
                <button
                  aria-label="Trang sau"
                  disabled={
                    classes.isFetching ||
                    !classes.data ||
                    page * classes.data.pageSize >= classes.data.totalCount
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {selectedId && (
          <aside className={styles.detailPanel}>
            {selected.isPending ? (
              <p className={styles.notice} role="status">
                Đang tải chi tiết lớp...
              </p>
            ) : selected.isError || !selectedClass ? (
              <p className={styles.notice}>
                Không tải được chi tiết lớp.{" "}
                <button onClick={() => void selected.refetch()}>Thử lại</button>
              </p>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <span className={styles.code}>{selectedClass.code}</span>
                    <h2>{selectedClass.name}</h2>
                    <span className={`${styles.badge} ${styles[`status${selectedClass.status}`]}`}>
                      {statusLabel[selectedClass.status]}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      className={styles.iconButton}
                      aria-label="Chỉnh sửa lớp"
                      title="Chỉnh sửa lớp"
                      onClick={() => setFormClass(selectedClass)}
                    >
                      <Edit3 size={17} />
                    </button>
                  )}
                </div>
                <p className={styles.description}>
                  {selectedClass.description || "Chưa có mô tả cho lớp học này."}
                </p>
                <dl className={styles.meta}>
                  <div>
                    <dt>Thời gian bắt đầu</dt>
                    <dd>{dateText(selectedClass.startDate)}</dd>
                  </div>
                  <div>
                    <dt>Thời gian kết thúc</dt>
                    <dd>{dateText(selectedClass.endDate)}</dd>
                  </div>
                  <div>
                    <dt>Cập nhật gần nhất</dt>
                    <dd>
                      {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                        new Date(selectedClass.updatedAt),
                      )}
                    </dd>
                  </div>
                </dl>
                <section className={styles.assignment}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>GIÁO VIÊN PHỤ TRÁCH</span>
                      <h3>
                        {selectedClass.teacherId
                          ? !isAdmin
                            ? "Giáo viên phụ trách"
                            : (historyTeachers.data?.[selectedClass.teacherId] ??
                              (historyTeachers.isPending
                                ? "Đang tải giáo viên..."
                                : "Giáo viên không có thông tin"))
                          : "Chưa phân công"}
                      </h3>
                    </div>
                  </div>
                  {isAdmin && (
                    <>
                      <div className={styles.teacherSearch}>
                        <Search size={15} />
                        <input
                          value={teacherSearch}
                          onChange={(event) => setTeacherSearch(event.target.value)}
                          placeholder="Tìm giáo viên để phân công..."
                        />
                      </div>
                      <div className={styles.teacherList}>
                        {teachers.isPending && (
                          <p className={styles.inlineState} role="status">
                            Đang tải giáo viên...
                          </p>
                        )}
                        {teachers.isError && (
                          <p className={styles.inlineState}>
                            Không tải được giáo viên.{" "}
                            <button onClick={() => void teachers.refetch()}>Thử lại</button>
                          </p>
                        )}
                        {teachers.isSuccess && !teachers.data.items.length && (
                          <p className={styles.inlineState}>Không tìm thấy giáo viên phù hợp.</p>
                        )}
                        {teachers.data?.items.slice(0, 5).map((teacher) => (
                          <button
                            key={teacher.id}
                            disabled={busy || teacher.id === selectedClass.teacherId}
                            onClick={() =>
                              void run(() =>
                                actions.assign.mutateAsync({
                                  id: selectedClass.id,
                                  teacherId: teacher.id,
                                }),
                              )
                            }
                          >
                            <span>{teacher.fullName.slice(0, 1)}</span>
                            <div>
                              <strong>{teacher.fullName}</strong>
                              <small>{teacher.email}</small>
                            </div>
                            {teacher.id === selectedClass.teacherId && <CheckCircle2 size={16} />}
                          </button>
                        ))}
                      </div>
                      {selectedClass.teacherId && selectedClass.status === "Draft" && (
                        <button
                          className={styles.unlinkButton}
                          disabled={busy}
                          onClick={() =>
                            void run(() => actions.unassign.mutateAsync(selectedClass.id))
                          }
                        >
                          Bỏ phân công giáo viên
                        </button>
                      )}
                    </>
                  )}
                </section>
                {isAdmin && (
                  <ClassEnrollments
                    key={selectedClass.id}
                    classId={selectedClass.id}
                    classStatus={selectedClass.status}
                  />
                )}
                {isAdmin && (
                  <section className={styles.lifecycle}>
                    <span className={styles.eyebrow}>VÒNG ĐỜI LỚP HỌC</span>
                    <div>
                      {editableStatus[selectedClass.status].map((next) => (
                        <button
                          key={next}
                          className={styles.secondaryButton}
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              actions.status.mutateAsync({ id: selectedClass.id, status: next }),
                            )
                          }
                        >
                          {next === "Active"
                            ? "Kích hoạt lớp"
                            : next === "Completed"
                              ? "Hoàn thành lớp"
                              : "Lưu trữ lớp"}
                        </button>
                      ))}
                      {selectedClass.status === "Archived" ? (
                        <>
                          <button
                            className={styles.secondaryButton}
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await actions.restore.mutateAsync(selectedClass.id);
                                navigate("/admin/classes/list");
                              })
                            }
                          >
                            <RotateCcw size={15} /> Khôi phục về{" "}
                            {selectedClass.archivedFromStatus
                              ? statusLabel[selectedClass.archivedFromStatus]
                              : "trạng thái trước lưu trữ"}
                          </button>
                          <button
                            className={styles.archiveButton}
                            disabled={busy}
                            onClick={() => runDelete(selectedClass.id)}
                          >
                            <Trash2 size={15} /> Xóa lớp
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.archiveButton}
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await actions.archive.mutateAsync(selectedClass.id);
                              navigate("/admin/classes/lifecycle");
                            })
                          }
                        >
                          <Archive size={15} /> Lưu trữ lớp
                        </button>
                      )}
                    </div>
                  </section>
                )}
                {isAdmin && (
                  <section className={styles.history}>
                    <span className={styles.eyebrow}>LỊCH SỬ PHÂN CÔNG</span>
                    {selected.data.instructorHistory.length ? (
                      selected.data.instructorHistory.map((record) => (
                        <div key={record.id}>
                          <span className={styles.historyDot} />
                          <p>
                            <strong>
                              {historyTeachers.data?.[record.teacherId] ??
                                (historyTeachers.isPending
                                  ? "Đang tải tên giáo viên..."
                                  : "Giáo viên không có thông tin")}
                            </strong>
                            <br />
                            <small>
                              Phân công{" "}
                              {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                                new Date(record.assignedAt),
                              )}
                              {record.unassignedAt
                                ? ` · Kết thúc ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(record.unassignedAt))}`
                                : " · Đang phụ trách"}
                            </small>
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className={styles.notice}>Chưa có lịch sử phân công.</p>
                    )}
                  </section>
                )}
              </>
            )}
          </aside>
        )}
      </section>
      {formClass && (
        <ClassForm
          initial={formClass === "new" ? undefined : formClass}
          pending={actions.create.isPending || actions.update.isPending}
          onSubmit={submitClass}
          onClose={() => {
            setFormClass(null);
            if (searchParams.has("create")) setSearchParams({}, { replace: true });
          }}
        />
      )}
      {confirmation && (
        <ClassActionDialog
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
          pending={busy}
          onConfirm={() => void confirmAction()}
        />
      )}
    </div>
  );
}
