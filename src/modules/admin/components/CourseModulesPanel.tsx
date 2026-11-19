import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button, ConfirmDialog, EmptyState } from "./ui";
import { CourseModuleCard } from "./CourseModuleCard";
import { CourseModuleFormModal } from "./CourseModuleFormModal";
import { useCourseModuleActions, useCourseModules } from "../hooks/useCourses";
import { useTimedMessage } from "../hooks/useTimedMessage";
import type { CourseModule, CourseModulePayload, CourseStatus } from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import styles from "./courseModules.module.css";

export function CourseModulesPanel({
  courseId,
  courseStatus,
}: {
  courseId: string;
  courseStatus: CourseStatus;
}) {
  const readOnly = courseStatus === "Archived";
  const query = useCourseModules(courseId);
  const refetchModules = query.refetch;
  const actions = useCourseModuleActions(courseId);
  const [editing, setEditing] = useState<CourseModule | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CourseModule | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useTimedMessage();
  const items = useMemo(
    () => query.data?.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    [query.data],
  );
  const busy =
    actions.create.isPending ||
    actions.update.isPending ||
    actions.remove.isPending ||
    actions.reorder.isPending;

  const move = useCallback(
    async (module: CourseModule, direction: -1 | 1) => {
      if (readOnly || actions.reorder.isPending) return;
      const from = items.findIndex((item) => item.id === module.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= items.length) return;
      const next = [...items];
      [next[from], next[to]] = [next[to], next[from]];
      try {
        await actions.reorder.mutateAsync(next.map((item) => item.id));
        setMessage("Đã cập nhật thứ tự học phần.");
      } catch (error) {
        setMessage(courseErrorMessage(error));
        void refetchModules();
      }
    },
    [readOnly, actions.reorder, items, setMessage, refetchModules],
  );

  const saveModule = async (payload: CourseModulePayload) => {
    if (readOnly) throw new Error("Khóa học đã lưu trữ, không thể chỉnh sửa học phần.");
    if (editing) await actions.update.mutateAsync({ id: editing.id, payload });
    else await actions.create.mutateAsync(payload);
    setMessage(editing ? "Đã cập nhật học phần." : "Đã thêm học phần.");
  };

  const confirmDelete = async () => {
    if (!deleting || readOnly || actions.remove.isPending) return;
    try {
      await actions.remove.mutateAsync(deleting.id);
      setMessage("Đã xóa học phần.");
      setDeleting(null);
    } catch (error) {
      setMessage(courseErrorMessage(error));
      void query.refetch();
    }
  };

  return (
    <section className={styles.panel} aria-label="Nội dung khóa học">
      <header className={styles.modulesHeader}>
        <div>
          <h3>Học phần</h3>
          <p>{items.length} học phần · sắp xếp và quản lý các bài học.</p>
        </div>
        {!readOnly && (
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            disabled={busy}
            onClick={() => {
              actions.create.reset();
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Thêm học phần
          </Button>
        )}
      </header>
      {readOnly && (
        <p className={styles.readOnly}>Khóa học đã lưu trữ. Nội dung ở chế độ chỉ xem.</p>
      )}
      {message && (
        <p
          className={message.startsWith("Đã ") ? styles.success : styles.error}
          role={message.startsWith("Đã ") ? "status" : "alert"}
        >
          {message}
        </p>
      )}
      {query.isError ? (
        <EmptyState
          title="Không tải được học phần"
          description={courseErrorMessage(query.error)}
          action={
            <Button size="sm" onClick={() => void query.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : query.isPending ? (
        <p className={styles.state} role="status">
          Đang tải học phần...
        </p>
      ) : !items.length ? (
        <EmptyState
          title="Khóa học chưa có học phần"
          description={
            readOnly ? undefined : "Thêm học phần đầu tiên để bắt đầu xây dựng nội dung khóa học."
          }
        />
      ) : (
        <div className={styles.moduleStack}>
          {items.map((module, index) => (
            <CourseModuleCard
              key={module.id}
              courseId={courseId}
              courseStatus={courseStatus}
              module={module}
              index={index}
              count={items.length}
              expanded={expanded.has(module.id)}
              busy={busy}
              onToggle={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(module.id)) next.delete(module.id);
                  else next.add(module.id);
                  return next;
                })
              }
              onEdit={() => {
                actions.update.reset();
                setEditing(module);
                setFormOpen(true);
              }}
              onMove={(direction) => void move(module, direction)}
              onDelete={() => {
                actions.remove.reset();
                setDeleting(module);
              }}
            />
          ))}
        </div>
      )}
      {formOpen && (
        <CourseModuleFormModal
          initial={editing ?? undefined}
          pending={actions.create.isPending || actions.update.isPending}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveModule}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa học phần"
        description={
          <>
            Bạn có chắc muốn xóa học phần <strong>{deleting?.title}</strong>? Chỉ học phần chưa có
            bài học mới có thể xóa.
          </>
        }
        confirmLabel="Xóa học phần"
        tone="danger"
        pending={actions.remove.isPending}
        error={actions.remove.error ? courseErrorMessage(actions.remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
