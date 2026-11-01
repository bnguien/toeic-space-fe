import { Link } from "react-router-dom";
import { CoursesPage } from "./CoursesPage";
import styles from "./ClassesPage.module.css";

export function CoursesLifecyclePage() {
  return (
    <div className={styles.page}>
      <nav className={styles.lifecycleTabs} aria-label="Khóa học lưu trữ">
        <Link
          to="/admin/courses/lifecycle"
          className={styles.lifecycleTabActive}
          aria-current="page"
        >
          Đã lưu trữ
        </Link>
      </nav>
      <CoursesPage archived />
    </div>
  );
}
