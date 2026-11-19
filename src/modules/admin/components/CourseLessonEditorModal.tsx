import { useState } from "react";
import { Button, Modal } from "./ui";
import { LessonEditorForm } from "./LessonEditorForm";
import { useCourseLesson } from "../hooks/useCourseLessons";
import type { CourseLessonSummary } from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import { clearLessonDraft, lessonDraftKey, readLessonDraft } from "../utils/lessonDraft";
import styles from "./lessonManagement.module.css";

export function CourseLessonEditorModal({
  courseId,
  moduleId,
  lesson,
  onClose,
  onSaved,
  onPreviewLesson,
}: {
  courseId: string;
  moduleId: string;
  lesson?: CourseLessonSummary;
  onClose: () => void;
  onSaved: () => void;
  onPreviewLesson: (lessonId: string) => void;
}) {
  const draftKey = lessonDraftKey(courseId, moduleId, lesson?.id);
  const [draft, setDraft] = useState(() => readLessonDraft(draftKey));
  const [restoredId, setRestoredId] = useState(() =>
    lesson ? null : (draft?.savedLessonId ?? null),
  );
  const detail = useCourseLesson(courseId, moduleId, lesson?.id ?? restoredId);
  if ((lesson || restoredId) && detail.isPending)
    return (
      <Modal
        open
        wide
        title="Đang tải bài học..."
        busy
        onClose={onClose}
        footer={<Button disabled>Đang tải...</Button>}
      >
        <p className={styles.state} role="status">
          Đang tải nội dung bài học...
        </p>
      </Modal>
    );
  if ((lesson || restoredId) && detail.isError)
    return (
      <Modal
        open
        wide
        title="Không tải được bài học"
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Đóng</Button>
            <Button variant="primary" onClick={() => void detail.refetch()}>
              Thử lại
            </Button>
            {!lesson && (
              <Button
                variant="danger-outline"
                onClick={() => {
                  clearLessonDraft(draftKey);
                  setDraft(null);
                  setRestoredId(null);
                }}
              >
                Bỏ bản nháp
              </Button>
            )}
          </>
        }
      >
        <p className={styles.error} role="alert">
          {courseErrorMessage(detail.error)}
        </p>
      </Modal>
    );
  return (
    <LessonEditorForm
      key={lesson?.id ?? restoredId ?? "new-lesson"}
      courseId={courseId}
      moduleId={moduleId}
      lesson={lesson || restoredId ? detail.data : undefined}
      draftKey={draftKey}
      draft={draft}
      onClose={onClose}
      onSaved={onSaved}
      onPreviewLesson={onPreviewLesson}
      onRefresh={() => void detail.refetch()}
    />
  );
}
