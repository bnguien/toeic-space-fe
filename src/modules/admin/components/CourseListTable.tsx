import { Link } from "react-router-dom";
import type { CourseExamType, CourseItem, CourseLevel, CourseStatus } from "../types/course.types";
import {
  courseExamTypeLabels,
  courseLevelLabels,
  courseStatusLabels,
} from "../utils/courseHelpers";
import styles from "./CourseListTable.module.css";

const shortExamTypeLabels: Record<CourseExamType, string> = {
  ListeningReading: "Listening & Reading",
  SpeakingWriting: "Speaking & Writing",
  FourSkills: "4 Kỹ năng",
};

const shortLevelLabels: Record<CourseLevel, string> = {
  Beginner: "Cơ bản",
  Intermediate: "Trung cấp",
  Advanced: "Nâng cao",
};

export function CourseListTable({
  items,
  basePath,
  status,
  level,
  examType,
}: {
  items: CourseItem[];
  basePath: string;
  status?: CourseStatus | "";
  level?: CourseLevel | "";
  examType?: CourseExamType | "";
}) {
  const buildQuery = () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (level) params.set("level", level);
    if (examType) params.set("examType", examType);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const querySuffix = buildQuery();

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Mã khóa học</th>
            <th scope="col">Tên khóa học</th>
            <th scope="col">Hình thức thi</th>
            <th scope="col">Trình độ</th>
            <th scope="col">Điểm mục tiêu</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className={styles.code}>
                <span className={styles.ellipsis}>{item.code}</span>
              </td>
              <td>
                <Link
                  className={`${styles.name} ${styles.ellipsis}`}
                  to={`${basePath}/${item.id}${querySuffix}`}
                  title={item.title}
                >
                  {item.title}
                </Link>
              </td>
              <td>
                <span className={styles.badge} title={courseExamTypeLabels[item.examType]}>
                  {shortExamTypeLabels[item.examType] || item.examType}
                </span>
              </td>
              <td>
                <span className={styles.badge} title={courseLevelLabels[item.level]}>
                  {shortLevelLabels[item.level] || item.level}
                </span>
              </td>
              <td>
                <span className={styles.targetScore}>
                  {item.targetScore !== null && item.targetScore !== undefined
                    ? `${item.targetScore}+`
                    : "—"}
                </span>
              </td>
              <td>
                <span className={`${styles.status} ${styles[item.status]}`}>
                  {courseStatusLabels[item.status]}
                </span>
              </td>
              <td>
                <Link className={styles.view} to={`${basePath}/${item.id}${querySuffix}`}>
                  Xem chi tiết
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
