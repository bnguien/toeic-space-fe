import { Construction } from "lucide-react";
import styles from "./TeacherMockPage.module.css";

export function TeacherMockPage({ title }: { title: string }) {
  return (
    <section className={styles.page}>
      <Construction size={34} />
      <span>LMS GIẢNG VIÊN TOEICSPACE</span>
      <h1>{title}</h1>
      <p>
        Giao diện đã sẵn sàng. Dữ liệu nghiệp vụ cho khu vực này đang được mô phỏng cho đến khi API
        tương ứng được triển khai.
      </p>
    </section>
  );
}
