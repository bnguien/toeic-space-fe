import { Link, useSearchParams } from "react-router-dom";

import { ClassesPage } from "./ClassesPage";
import { DeletedClassesPage } from "./DeletedClassesPage";
import styles from "./ClassesPage.module.css";

export function ClassesLifecyclePage() {
  const [params] = useSearchParams();
  const deleted = params.get("tab") === "deleted";

  return (
    <div className={styles.page}>
      <nav className={styles.lifecycleTabs} aria-label="Lớp học lưu trữ và đã xóa">
        <Link
          to="/admin/classes/lifecycle"
          className={deleted ? "" : styles.lifecycleTabActive}
          aria-current={deleted ? undefined : "page"}
        >
          Đã lưu trữ
        </Link>
        <Link
          to="/admin/classes/lifecycle?tab=deleted"
          className={deleted ? styles.lifecycleTabActive : ""}
          aria-current={deleted ? "page" : undefined}
        >
          Đã xóa
        </Link>
      </nav>
      {deleted ? <DeletedClassesPage /> : <ClassesPage archived />}
    </div>
  );
}
