import { Link } from "react-router-dom";
import type { PublicCourseDetail } from "./courseCatalog";
import { CourseEnrollmentAction } from "./CourseEnrollmentAction";
import { CourseHero } from "./CourseHero";
import styles from "./courseCatalog.module.css";

export function CourseBanner({ course, back }: { course: PublicCourseDetail; back: string }) {
  return (
    <CourseHero
      detail
      eyebrow={
        <>
          TRANG CHỦ <span aria-hidden="true">›</span> KHÓA HỌC <span aria-hidden="true">›</span> CHI
          TIẾT
        </>
      }
      title={course.title}
      description={course.shortDescription || "Khám phá nội dung và lộ trình học."}
      footer={<CourseEnrollmentAction course={course} />}
    >
      <Link className={styles.bannerLink} to={back}>
        ← Danh sách khóa học
      </Link>
    </CourseHero>
  );
}
