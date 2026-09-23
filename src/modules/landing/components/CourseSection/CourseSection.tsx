import { Link } from "react-router-dom";
import { IconCheck } from "../icons/LandingIcons";
import { FEATURED_COURSES } from "../../constants";
import styles from "./CourseSection.module.css";

export const CourseSection = () => {
  return (
    <section id="courses" className={styles.section}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badgePill}>
            <span className={styles.badgeNumber}>05</span>
            <span className={styles.badgeLabel}>KHÓA HỌC TOEIC</span>
          </div>
          <h2 className={styles.title}>Chương trình học tinh gọn & cá nhân hoá</h2>
          <p className={styles.subtitle}>
            Thiết kế riêng theo từng band điểm mục tiêu, từ người mất gốc đến mục tiêu 800+ điểm
            TOEIC.
          </p>
        </div>

        {/* 3 Course Cards */}
        <div className={styles.coursesGrid}>
          {FEATURED_COURSES.map((course) => {
            const isHighlight = course.badge === "Bán chạy nhất";
            return (
              <div
                key={course.id}
                className={`${styles.courseCard} ${isHighlight ? styles.cardHighlight : ""}`}
              >
                {course.badge && <span className={styles.popularBadge}>{course.badge}</span>}

                <div className={styles.bandTag}>{course.band}</div>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <p className={styles.courseDesc}>{course.description}</p>

                <div className={styles.metaRow}>
                  <span>⏱ {course.duration}</span>
                  <span>
                    ★ {course.rating} ({course.reviews})
                  </span>
                </div>

                <ul className={styles.featureList}>
                  {course.features.map((feat) => (
                    <li key={feat} className={styles.featureItem}>
                      <span className={styles.checkIcon}>
                        <IconCheck size={16} />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className={styles.priceRow}>
                  <span className={styles.priceCurrent}>{course.price}</span>
                  <span className={styles.priceOriginal}>{course.originalPrice}</span>
                </div>

                <Link
                  to="/register"
                  className={`${styles.enrollBtn} ${isHighlight ? styles.enrollBtnHighlight : ""}`}
                >
                  Đăng ký lộ trình này
                </Link>
              </div>
            );
          })}
        </div>

        {/* View More / Detail Link */}
        <div className={styles.viewMoreRow}>
          <Link to="/courses" className={styles.viewMoreBtn}>
            <span>Xem tất cả khóa học & chương trình ôn thi TOEIC</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
