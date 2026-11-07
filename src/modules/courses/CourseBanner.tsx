import { Link } from "react-router-dom";
import { CourseHero } from "./CourseHero";
import styles from "./courseCatalog.module.css";

export function CourseBanner({
  title,
  description,
  back,
}: {
  title: string;
  description: string;
  back: string;
}) {
  return (
    <CourseHero
      detail
      eyebrow={
        <>
          TRANG CHỦ <span aria-hidden="true">›</span> KHÓA HỌC <span aria-hidden="true">›</span> CHI
          TIẾT
        </>
      }
      title={title}
      description={description}
      footer={
        <div className={styles.coursePrice} aria-label="Giá khóa học minh họa">
          <div>
            <span className={styles.priceLabel}>Giá niêm yết</span>
            <s>1.200.000 đ</s>
          </div>
          <div>
            <span className={styles.priceLabel}>Giá khuyến mãi</span>
            <strong>890.000 đ</strong>
          </div>
          <div className={styles.coursePriceAction}>
            <button type="button" disabled aria-describedby="course-price-note">
              Mua ngay
            </button>
            <small id="course-price-note">
              Giá minh họa · tính năng mua khóa học chưa khả dụng
            </small>
          </div>
        </div>
      }
    >
      <Link className={styles.bannerLink} to={back}>
        ← Danh sách khóa học
      </Link>
    </CourseHero>
  );
}
