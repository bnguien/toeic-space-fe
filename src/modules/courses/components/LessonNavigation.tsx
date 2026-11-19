import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicLesson } from "../courseCatalog";
import styles from "./LessonNavigation.module.css";

interface LessonNavigationProps {
  prevLesson?: PublicLesson | null;
  nextLesson?: PublicLesson | null;
  basePath: string;
  query?: string;
  isEnrolled?: boolean;
}

export function LessonNavigation({
  prevLesson,
  nextLesson,
  basePath,
  query = "",
  isEnrolled = true,
}: LessonNavigationProps) {
  if (!prevLesson && !nextLesson) return null;

  const getLink = (lesson: PublicLesson) => {
    if (isEnrolled) {
      return `${basePath}/${lesson.id}`;
    }
    return `/courses/${basePath.split("/")[2]}/lessons/${lesson.id}/preview${query}`;
  };

  return (
    <nav className={styles.navigationBar} aria-label="Điều hướng bài học">
      {prevLesson ? (
        <Link to={getLink(prevLesson)} className={styles.navLink}>
          <ChevronLeft size={18} className={styles.navIcon} />
          <div>
            <span className={styles.navDirection}>Bài trước</span>
            <span className={styles.navTitle}>{prevLesson.title}</span>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {nextLesson && (
        <Link to={getLink(nextLesson)} className={`${styles.navLink} ${styles.nextLink}`}>
          <ChevronRight size={18} className={styles.navIcon} />
          <div>
            <span className={styles.navDirection}>Bài tiếp theo</span>
            <span className={styles.navTitle}>{nextLesson.title}</span>
          </div>
        </Link>
      )}
    </nav>
  );
}
