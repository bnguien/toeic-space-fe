import { usePopover } from "./ui/usePopover";
import { IconButton } from "./ui";
import { ChevronDown, ChevronUp, Ellipsis, ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import type { CourseModule, CourseStatus } from "../types/course.types";
import { useCourseLessons } from "../hooks/useCourseLessons";
import { CourseLessonsPanel } from "./CourseLessonsPanel";
import uiStyles from "./ui/ui.module.css";
import styles from "./courseModules.module.css";

export function CourseModuleCard({
  courseId,
  courseStatus,
  module,
  index,
  count,
  expanded,
  busy,
  onToggle,
  onEdit,
  onMove,
  onDelete,
}: {
  courseId: string;
  courseStatus: CourseStatus;
  module: CourseModule;
  index: number;
  count: number;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const readOnly = courseStatus === "Archived";
  const lessons = useCourseLessons(courseId, module.id);
  const { open, toggle, close, anchorRef, triggerRef } = usePopover();

  return (
    <article className={styles.moduleCard}>
      <header className={styles.moduleCardHeader}>
        <span className={styles.moduleNumber}>{String(index + 1).padStart(2, "0")}</span>
        <button
          type="button"
          className={styles.moduleToggle}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <strong>{module.title}</strong>
          <span>
            {lessons.isPending ? "Đang tải bài học..." : `${lessons.data?.length ?? 0} bài học`}
            {module.description?.trim() ? ` · ${module.description}` : ""}
          </span>
        </button>
        <div className={styles.moduleCardActions}>
          <IconButton
            label={expanded ? "Thu gọn học phần" : "Mở học phần"}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
          {!readOnly && (
            <div className={uiStyles.popoverAnchor} ref={anchorRef}>
              <IconButton
                ref={triggerRef}
                label={`Thao tác học phần ${module.title}`}
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
                  aria-label={`Thao tác học phần ${module.title}`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={uiStyles.menuItem}
                    onClick={() => {
                      close();
                      onEdit();
                    }}
                  >
                    <Pencil size={15} />
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={uiStyles.menuItem}
                    disabled={busy || index === 0}
                    onClick={() => {
                      close();
                      onMove(-1);
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
                      onMove(1);
                    }}
                  >
                    <ArrowDown size={15} />
                    Di chuyển xuống
                  </button>
                  <div className={uiStyles.menuDivider} role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className={`${uiStyles.menuItem} ${styles.dangerMenuItem}`}
                    onClick={() => {
                      close();
                      onDelete();
                    }}
                  >
                    <Trash2 size={15} />
                    Xóa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {expanded && (
        <div className={styles.moduleLessons}>
          <CourseLessonsPanel
            courseId={courseId}
            moduleId={module.id}
            courseStatus={courseStatus}
          />
        </div>
      )}
    </article>
  );
}
