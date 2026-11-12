import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { PublicCourseSummary } from "./courseCatalog";
import { examLabels, levelLabels } from "./courseCatalog";
import type { MyCourse } from "./purchaseApi";
import styles from "./courseCatalog.module.css";

const formatVnd = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;

export function CourseThumbnail({
  url,
  title,
  onError,
}: {
  url: string | null;
  title: string;
  onError?: () => void;
}) {
  return (
    <div className={styles.thumbnail}>
      <span className={styles.imageFallback}>TOEICSpace</span>
      {url && (
        <img
          key={url}
          src={url}
          alt={`Ảnh khóa học ${title}`}
          onError={(event) => {
            event.currentTarget.hidden = true;
            onError?.();
          }}
        />
      )}
    </div>
  );
}

export function CourseCard({
  course,
  to,
  onImageError,
}: {
  course: PublicCourseSummary | MyCourse;
  to: string;
  onImageError?: () => void;
}) {
  const owned = "courseId" in course;
  return (
    <Link
      className={styles.card}
      to={to}
      aria-label={`${owned ? "Tiếp tục học" : "Xem khóa học"} ${course.title}`}
    >
      <CourseThumbnail url={course.thumbnailUrl} title={course.title} onError={onImageError} />
      {!owned && course.promotion && (
        <span className={styles.cardDiscountBadge}>
          -{Math.max(1, Math.round((course.promotion.discountAmount / course.price) * 100))}%
        </span>
      )}
      <div className={styles.cardBody}>
        <h2>{course.title}</h2>
        {course.shortDescription && (
          <p className={styles.cardDescription}>{course.shortDescription}</p>
        )}

        <div className={styles.cardTagsRow}>
          <div className={styles.cardTags}>
            {owned ? (
              <span className={styles.examTag}>Đang học</span>
            ) : (
              <>
                <span className={styles.examTag} data-exam={course.examType}>
                  {examLabels[course.examType]}
                </span>
                <span className={styles.levelTag} data-level={course.level}>
                  {levelLabels[course.level]}
                </span>
              </>
            )}
          </div>
          {!owned && course.targetScore !== null && (
            <span className={styles.cardScore}>{course.targetScore}+</span>
          )}
        </div>

        <div className={styles.cardFooter}>
          {owned ? (
            <span className={styles.cardEnrolled}>
              Đã đăng ký: {new Date(course.enrolledAt).toLocaleDateString("vi-VN")}
            </span>
          ) : (
            <div className={styles.cardPriceRow}>
              {course.price === 0 ? (
                <span className={styles.cardPriceSale}>Miễn phí</span>
              ) : (
                <div className={styles.cardPriceGroup}>
                  <span className={styles.cardPriceSale}>
                    {course.promotion?.sellingPrice === 0
                      ? "Miễn phí"
                      : formatVnd(course.promotion?.sellingPrice ?? course.price)}
                  </span>
                  {course.promotion && (
                    <s className={styles.cardPriceOriginal}>{formatVnd(course.price)}</s>
                  )}
                </div>
              )}
              {course.capacity !== null && course.remainingSeats !== null && (
                <span className={styles.cardSeats}>
                  {course.remainingSeats === 0 ? "Đã hết chỗ" : `Còn ${course.remainingSeats} chỗ`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={styles.cardOverlay}>
        <span className={styles.overlayEyebrow}>
          {owned ? "Đang học" : examLabels[course.examType]}
        </span>
        <p>{course.shortDescription || "Khám phá nội dung và lộ trình học của khóa học này."}</p>
        <div className={styles.overlayBottom}>
          <span className={styles.overlayAction}>
            {owned ? "Tiếp tục học" : "Xem chi tiết"} <ArrowUpRight size={18} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className={styles.cardSkeleton} aria-hidden="true">
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonBody}>
        <span className={styles.skeletonTag} />
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLineShort} />
      </div>
    </div>
  );
}
