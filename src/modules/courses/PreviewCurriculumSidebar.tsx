import { Link } from "react-router-dom";
import { LockKeyhole, PlayCircle } from "lucide-react";
import { Button } from "@/modules/admin";
import { usePublicCourse, type PublicPreview } from "./courseCatalog";
import styles from "./courseCatalog.module.css";

export function PreviewCurriculumSidebar({
  courseId,
  lessonId,
  query,
  attachments,
  onRefreshDocuments,
}: {
  courseId: string | undefined;
  lessonId: string | undefined;
  query: string;
  attachments: PublicPreview["attachments"];
  onRefreshDocuments: () => void;
}) {
  const course = usePublicCourse(courseId);
  return (
    <aside className={styles.previewSidebar} aria-label="Nội dung khóa học">
      <h2>Nội dung khóa học</h2>
      {course.isPending ? (
        <p role="status">Đang tải các bài học…</p>
      ) : course.isError ? (
        <div>
          <p>Không tải được nội dung khóa học.</p>
          <Button size="sm" onClick={() => void course.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !course.data.modules.length ? (
        <p>Chưa có bài học công khai.</p>
      ) : (
        <div className={styles.previewModules}>
          {course.data.modules.map((module) => (
            <details key={module.id} open={module.lessons.some((lesson) => lesson.id === lessonId)}>
              <summary>
                {module.title}
                <small>{module.lessons.length} bài học</small>
              </summary>
              <ul>
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    {lesson.isFreePreview ? (
                      <Link
                        className={styles.previewLessonLink}
                        data-current={lesson.id === lessonId || undefined}
                        aria-current={lesson.id === lessonId ? "page" : undefined}
                        to={`/courses/${courseId}/lessons/${lesson.id}/preview${query}`}
                      >
                        <PlayCircle size={17} aria-hidden="true" />
                        <span>{lesson.title}</span>
                      </Link>
                    ) : (
                      <span className={styles.previewLessonLocked}>
                        <LockKeyhole size={16} aria-hidden="true" />
                        <span>{lesson.title}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <section className={styles.previewDocuments} aria-labelledby="preview-documents-title">
          <h2 id="preview-documents-title">Tài liệu</h2>
          <ul className={styles.attachmentList}>
            {attachments.map((file) => (
              <li key={file.id}>
                <a
                  className={styles.attachmentLink}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {file.fileName}
                </a>
              </li>
            ))}
          </ul>
          <p>Nếu liên kết không mở được, hãy tải liên kết mới.</p>
          <Button size="sm" onClick={onRefreshDocuments}>
            Tải liên kết mới
          </Button>
        </section>
      )}
    </aside>
  );
}
