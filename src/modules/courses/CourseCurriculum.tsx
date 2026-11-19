import { Link } from "react-router-dom";
import { LockKeyhole, PlayCircle } from "lucide-react";
import { Badge } from "@/modules/admin";
import type { PublicModule } from "./courseCatalog";
import { durationLabel } from "./courseCatalog";
import styles from "./courseCatalog.module.css";

export function CourseCurriculum({
  modules,
  courseId,
  query,
}: {
  modules: PublicModule[];
  courseId: string;
  query: string;
}) {
  if (!modules.length) return <p>Chưa có nội dung công khai.</p>;
  return (
    <div className={styles.curriculum}>
      {modules.map((module, index) => (
        <details key={module.id} className={styles.module} open={index === 0}>
          <summary>
            <span>{module.title}</span>
            <small>{module.lessons.length} bài học</small>
          </summary>
          {module.description && <p className={styles.moduleDescription}>{module.description}</p>}
          <ol className={styles.lessons}>
            {module.lessons.map((lesson) => (
              <li key={lesson.id}>
                <div className={styles.lessonInfo}>
                  <strong>{lesson.title}</strong>
                  <span>{durationLabel(lesson.durationSeconds)}</span>
                </div>
                {lesson.isFreePreview ? (
                  <Link
                    className={styles.previewLink}
                    to={`/courses/${courseId}/lessons/${lesson.id}/preview${query}`}
                  >
                    <PlayCircle size={18} aria-hidden="true" />
                    <Badge tone="green">Xem trước miễn phí</Badge>
                  </Link>
                ) : (
                  <span className={styles.locked}>
                    <LockKeyhole size={16} aria-hidden="true" /> Nội dung khóa
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
