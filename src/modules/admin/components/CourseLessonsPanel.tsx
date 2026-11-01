import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button, ConfirmDialog } from "./ui";
import { CourseLessonRow } from "./CourseLessonRow";
import { CourseLessonEditorModal } from "./CourseLessonEditorModal";
import { LessonPreviewModal } from "./LessonPreviewModal";
import { useCourseLessonActions, useCourseLessons } from "../hooks/useCourseLessons";
import { useTimedMessage } from "../hooks/useTimedMessage";
import type { CourseLessonSummary, CourseStatus } from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import styles from "./lessonManagement.module.css";

export function CourseLessonsPanel({
  courseId,
  moduleId,
  courseStatus,
}: {
  courseId: string;
  moduleId: string;
  courseStatus: CourseStatus;
}) {
  const readOnly = courseStatus === "Archived";
  const lessons = useCourseLessons(courseId, moduleId);
  const refetchLessons = lessons.refetch;
  const actions = useCourseLessonActions(courseId, moduleId);
  const [editing, setEditing] = useState<CourseLessonSummary | "new" | null>(null);
  const [deleting, setDeleting] = useState<CourseLessonSummary | null>(null);
  const [statusAction, setStatusAction] = useState<{
    lesson: CourseLessonSummary;
    publish: boolean;
  } | null>(null);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [message, setMessage] = useTimedMessage();
  const busy =
    actions.reorder.isPending ||
    actions.remove.isPending ||
    actions.publish.isPending ||
    actions.unpublish.isPending ||
    actions.setFreePreview.isPending;
  const items = useMemo(
    () => lessons.data?.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    [lessons.data],
  );

  const move = useCallback(
    async (lesson: CourseLessonSummary, direction: -1 | 1) => {
      if (readOnly || busy) return;
      const from = items.findIndex((item) => item.id === lesson.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= items.length) return;
      const reordered = [...items];
      [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
      try {
        await actions.reorder.mutateAsync(reordered.map((item) => item.id));
        setMessage("Đã cập nhật thứ tự bài học.");
      } catch (error) {
        setMessage(courseErrorMessage(error));
        void refetchLessons();
      }
    },
    [readOnly, busy, items, actions.reorder, refetchLessons, setMessage],
  );

  const deleteLesson = async () => {
    if (!deleting || readOnly || actions.remove.isPending) return;
    try {
      await actions.remove.mutateAsync(deleting.id);
      setDeleting(null);
      setMessage("Đã xóa bài học.");
    } catch (error) {
      setMessage(courseErrorMessage(error));
      void refetchLessons();
    }
  };

  const changeStatus = async () => {
    if (!statusAction || readOnly) return;
    try {
      if (statusAction.publish) await actions.publish.mutateAsync(statusAction.lesson.id);
      else await actions.unpublish.mutateAsync(statusAction.lesson.id);
      setMessage(statusAction.publish ? "Đã xuất bản bài học." : "Đã chuyển bài học về bản nháp.");
      setStatusAction(null);
    } catch (error) {
      setMessage(courseErrorMessage(error));
    }
  };

  return (
    <section className={styles.lessonsPanel} aria-label="Bài học trong học phần">
      <header className={styles.lessonsHeader}>
        <div>
          <h4>Bài học</h4>
          <p>Sắp xếp và quản lý nội dung bài học trong học phần này.</p>
        </div>
        {!readOnly && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            disabled={busy}
            onClick={() => setEditing("new")}
          >
            Thêm bài học
          </Button>
        )}
      </header>
      {message && (
        <p
          className={message.startsWith("Đã ") ? styles.success : styles.error}
          role={message.startsWith("Đã ") ? "status" : "alert"}
        >
          {message}
        </p>
      )}
      {lessons.isPending ? (
        <p className={styles.state} role="status">
          Đang tải bài học...
        </p>
      ) : lessons.isError ? (
        <p className={styles.error} role="alert">
          {courseErrorMessage(lessons.error)}{" "}
          <button onClick={() => void lessons.refetch()}>Thử lại</button>
        </p>
      ) : !items.length ? (
        <p className={styles.state}>Học phần chưa có bài học.</p>
      ) : (
        <ol className={styles.lessonList}>
          {items.map((lesson, index) => (
            <CourseLessonRow
              key={lesson.id}
              courseId={courseId}
              moduleId={moduleId}
              lesson={lesson}
              index={index}
              count={items.length}
              readOnly={readOnly}
              busy={busy}
              onMove={move}
              onEdit={() => setEditing(lesson)}
              onDelete={() => {
                actions.remove.reset();
                setDeleting(lesson);
              }}
              onStatus={() => setStatusAction({ lesson, publish: lesson.status === "Draft" })}
              onPreview={() => setPreviewLessonId(lesson.id)}
              onFreePreview={(value) =>
                actions.setFreePreview.mutate(
                  { id: lesson.id, value },
                  {
                    onError: (error) => setMessage(courseErrorMessage(error)),
                    onSuccess: () =>
                      setMessage(
                        value ? "Đã bật xem trước miễn phí." : "Đã tắt xem trước miễn phí.",
                      ),
                  },
                )
              }
            />
          ))}
        </ol>
      )}
      {editing && (
        <CourseLessonEditorModal
          key={typeof editing === "string" ? "new" : editing.id}
          courseId={courseId}
          moduleId={moduleId}
          lesson={editing === "new" ? undefined : editing}
          onPreviewLesson={setPreviewLessonId}
          onClose={() => setEditing(null)}
          onSaved={() => void lessons.refetch()}
        />
      )}
      {previewLessonId && (
        <LessonPreviewModal
          key={previewLessonId}
          courseId={courseId}
          moduleId={moduleId}
          lessonId={previewLessonId}
          onClose={() => setPreviewLessonId(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa bài học"
        description={
          <>
            Bạn có chắc muốn xóa bài học <strong>{deleting?.title}</strong>? Thao tác này không thể
            hoàn tác.
          </>
        }
        confirmLabel="Xóa bài học"
        tone="danger"
        pending={actions.remove.isPending}
        error={actions.remove.error ? courseErrorMessage(actions.remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void deleteLesson()}
      />
      <ConfirmDialog
        open={Boolean(statusAction)}
        title={statusAction?.publish ? "Xuất bản bài học" : "Chuyển bài học về bản nháp"}
        description={
          <>
            Xác nhận {statusAction?.publish ? "xuất bản" : "ẩn bài học"}{" "}
            <strong>{statusAction?.lesson.title}</strong>?
          </>
        }
        confirmLabel={statusAction?.publish ? "Xuất bản" : "Chuyển về bản nháp"}
        pending={actions.publish.isPending || actions.unpublish.isPending}
        error={
          actions.publish.error || actions.unpublish.error
            ? courseErrorMessage(actions.publish.error || actions.unpublish.error)
            : null
        }
        onClose={() => setStatusAction(null)}
        onConfirm={() => void changeStatus()}
      />
    </section>
  );
}
