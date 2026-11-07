import { ArrowDown, ArrowUp, Ellipsis, Eye, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "./ui";
import { usePopover } from "./ui/usePopover";
import { useCourseLesson } from "../hooks/useCourseLessons";
import type { CourseLessonSummary } from "../types/course.types";
import styles from "./lessonManagement.module.css";
import uiStyles from "./ui/ui.module.css";

const statusLabels = { Draft: "Bản nháp", Published: "Đã xuất bản" } as const;

export function CourseLessonRow({
  courseId,
  moduleId,
  lesson,
  index,
  count,
  readOnly,
  busy,
  onMove,
  onEdit,
  onDelete,
  onStatus,
  onPreview,
  onFreePreview,
}: {
  courseId: string;
  moduleId: string;
  lesson: CourseLessonSummary;
  index: number;
  count: number;
  readOnly: boolean;
  busy: boolean;
  onMove: (lesson: CourseLessonSummary, direction: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: () => void;
  onPreview: () => void;
  onFreePreview: (value: boolean) => void;
}) {
  const { open, toggle, close, anchorRef, triggerRef } = usePopover();
  const detail = useCourseLesson(courseId, moduleId, lesson.id);
  const content = detail.data;
  return (
    <li className={styles.lessonRow}>
      <span className={styles.lessonOrder}>{index + 1}.</span>
      <div className={styles.lessonMain}>
        <strong>{lesson.title}</strong>
        <div className={styles.lessonMeta}>
          <span className={styles.lessonStatus} data-status={lesson.status}>
            {statusLabels[lesson.status]}
          </span>
          {lesson.durationSeconds !== null && (
            <span>{Math.floor(lesson.durationSeconds / 60)} phút</span>
          )}
          {lesson.isFreePreview && <span className={styles.freePreview}>Xem trước miễn phí</span>}
        </div>
      </div>
      <div className={styles.contentIndicators} aria-label="Nội dung bài học">
        {detail.isPending ? (
          <span className={styles.muted}>Đang tải nội dung...</span>
        ) : detail.isError ? (
          <span className={styles.muted}>
            Nội dung chưa tải được{" "}
            <button className={styles.inlineLink} onClick={() => void detail.refetch()}>
              Thử lại
            </button>
          </span>
        ) : (
          <>
            {content?.textContent && <span className={styles.contentType}>Văn bản</span>}
            {content?.videos.length ? (
              <span className={styles.contentType}>{content.videos.length} video</span>
            ) : null}
            {content?.resources.length ? (
              <span className={styles.contentType}>{content.resources.length} tệp</span>
            ) : null}
            {!content?.textContent && !content?.videos.length && !content?.resources.length && (
              <span className={styles.muted}>Chưa có nội dung</span>
            )}
          </>
        )}
      </div>
      <div className={styles.lessonActions} ref={anchorRef}>
        <IconButton
          ref={triggerRef}
          label={`Thao tác bài học ${lesson.title}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
        >
          <Ellipsis size={18} />
        </IconButton>
        {open && (
          <div
            className={uiStyles.menu}
            role="menu"
            aria-label={`Thao tác bài học ${lesson.title}`}
          >
            {!readOnly && (
              <button
                type="button"
                role="menuitem"
                className={uiStyles.menuItem}
                disabled={busy}
                onClick={() => {
                  close();
                  onEdit();
                }}
              >
                <Pencil size={15} />
                Chỉnh sửa
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className={uiStyles.menuItem}
              onClick={() => {
                close();
                onPreview();
              }}
            >
              <Eye size={15} />
              Xem trước
            </button>
            {!readOnly && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={uiStyles.menuItem}
                  disabled={busy}
                  onClick={() => {
                    close();
                    onStatus();
                  }}
                >
                  {lesson.status === "Draft" ? "Xuất bản" : "Hủy xuất bản"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={uiStyles.menuItem}
                  disabled={busy || index === 0}
                  onClick={() => {
                    close();
                    onMove(lesson, -1);
                  }}
                >
                  <ArrowUp size={15} />
                  Di chuyển lên
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={uiStyles.menuItem}
                  disabled={busy || index === count - 1}
                  onClick={() => {
                    close();
                    onMove(lesson, 1);
                  }}
                >
                  <ArrowDown size={15} />
                  Di chuyển xuống
                </button>
                <label
                  className={uiStyles.checkItem}
                  role="menuitemcheckbox"
                  aria-checked={lesson.isFreePreview}
                >
                  <input
                    type="checkbox"
                    checked={lesson.isFreePreview}
                    disabled={busy}
                    onChange={(event) => onFreePreview(event.target.checked)}
                  />
                  Cho xem trước miễn phí
                </label>
                <div className={uiStyles.menuDivider} role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className={`${uiStyles.menuItem} ${styles.deleteMenuItem}`}
                  disabled={busy}
                  onClick={() => {
                    close();
                    onDelete();
                  }}
                >
                  <Trash2 size={15} />
                  Xóa
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
