import { Link } from "react-router-dom";
import type { ClassItem, ClassStatus } from "../types/class.types";
import styles from "./ClassListTable.module.css";

const labels: Record<ClassStatus, string> = {
  Draft: "Bản nháp",
  Active: "Đang hoạt động",
  Completed: "Đã hoàn thành",
  Archived: "Đã lưu trữ",
};

const dateText = (value: string | null) =>
  value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "Chưa thiết lập";

export function ClassListTable({
  items,
  basePath,
  status,
  teacherNames,
  teachersPending,
  isAdmin,
}: {
  items: ClassItem[];
  basePath: string;
  status: ClassStatus | "";
  teacherNames?: Record<string, string>;
  teachersPending: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Mã lớp</th>
            <th scope="col">Tên lớp</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Bắt đầu</th>
            <th scope="col">Kết thúc</th>
            <th scope="col">Giáo viên</th>
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
                  to={`${basePath}/${item.id}${status ? `?status=${status}` : ""}`}
                >
                  {item.name}
                </Link>
              </td>
              <td>
                <span className={`${styles.status} ${styles[item.status]}`}>
                  {labels[item.status]}
                </span>
              </td>
              <td>
                <span className={styles.ellipsis}>{dateText(item.startDate)}</span>
              </td>
              <td>
                <span className={styles.ellipsis}>{dateText(item.endDate)}</span>
              </td>
              <td>
                <span className={styles.ellipsis}>
                  {item.teacherId
                    ? !isAdmin
                      ? "Giáo viên phụ trách"
                      : (teacherNames?.[item.teacherId] ??
                        (teachersPending ? "Đang tải..." : "Không có thông tin"))
                    : "Chưa phân công"}
                </span>
              </td>
              <td>
                <Link
                  className={styles.view}
                  to={`${basePath}/${item.id}${status ? `?status=${status}` : ""}`}
                >
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
