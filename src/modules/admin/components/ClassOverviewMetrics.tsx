import { Link } from "react-router-dom";
import { BookOpenCheck, CalendarCheck2, GraduationCap, UsersRound } from "lucide-react";
import styles from "../pages/ClassesOverviewMetrics.module.css";

export function ClassOverviewMetrics({
  activeCount,
  students,
  attendance,
}: {
  activeCount: number | string | undefined;
  students: number;
  attendance: number;
}) {
  return (
    <section className={styles.metrics} aria-label="Chỉ số lớp học">
      <Link to="/admin/classes/list?status=Active">
        <div className={styles.topLine}>
          <span className={`${styles.icon} ${styles.blue}`}>
            <BookOpenCheck size={21} />
          </span>
          <span className={styles.change}>+2</span>
        </div>
        <strong>{activeCount ?? "…"}</strong>
        <span className={styles.label}>Lớp đang hoạt động</span>
      </Link>
      <Link to="/admin/students/list">
        <div className={styles.topLine}>
          <span className={`${styles.icon} ${styles.gold}`}>
            <UsersRound size={21} />
          </span>
          <span className={styles.change}>+18</span>
        </div>
        <strong>{students}</strong>
        <span className={styles.label}>Học viên đang học</span>
      </Link>
      <Link to="/admin/classes/list">
        <div className={styles.topLine}>
          <span className={`${styles.icon} ${styles.green}`}>
            <CalendarCheck2 size={21} />
          </span>
          <span className={`${styles.change} ${styles.negative}`}>−3%</span>
        </div>
        <strong>{attendance}%</strong>
        <span className={styles.label}>Chuyên cần tuần này</span>
      </Link>
      <Link className={styles.attentionMetric} to="/admin/classes/list">
        <div className={styles.topLine}>
          <span className={`${styles.icon} ${styles.red}`}>
            <GraduationCap size={21} />
          </span>
          <span className={`${styles.change} ${styles.negative}`}>Cần theo dõi</span>
        </div>
        <strong className={styles.warning}>9</strong>
        <span className={styles.label}>Lớp cần chú ý</span>
      </Link>
    </section>
  );
}
