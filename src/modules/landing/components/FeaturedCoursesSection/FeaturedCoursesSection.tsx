import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";

import styles from "./FeaturedCoursesSection.module.css";

/** A course shown on the home page; filled from the course catalogue later. */
export interface FeaturedCourse {
  id: string;
  title: string;
  /** Short line under the title (target band, length…). */
  subtitle?: string;
  to: string;
}

interface FeaturedCoursesSectionProps {
  /** Empty until featured courses are chosen: the section shows a "coming soon" block. */
  courses?: readonly FeaturedCourse[];
}

/** White home section reserved for featured courses ("Khoá học nổi bật"). */
export function FeaturedCoursesSection({ courses = [] }: FeaturedCoursesSectionProps) {
  return (
    <section id="khoa-hoc" className={styles.section} aria-labelledby="khoa-hoc-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 id="khoa-hoc-title" className={styles.title}>
            Khoá học <span>nổi bật</span>
          </h2>
          <p className={styles.subtitle}>Khoá học TOEIC chọn lọc theo từng mục tiêu điểm.</p>
        </header>

        {courses.length > 0 ? (
          <ul className={styles.grid}>
            {courses.map((course) => (
              <li key={course.id}>
                <Link to={course.to} className={styles.card}>
                  <b>{course.title}</b>
                  {course.subtitle && <small>{course.subtitle}</small>}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.soon} role="status">
            <span className={styles.soonIcon} aria-hidden="true">
              <GraduationCap size={28} />
            </span>
            <p>
              <b>Sắp ra mắt</b>
              Các khoá học nổi bật sẽ được giới thiệu tại đây.
            </p>
            <Link to="/courses" className={styles.all}>
              Xem tất cả khoá học <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
