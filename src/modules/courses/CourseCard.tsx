import { ArrowUpRight, Target } from "lucide-react";
import { Link } from "react-router-dom";
import type { PublicCourseSummary } from "./courseCatalog";
import { examLabels, levelLabels } from "./courseCatalog";
import styles from "./courseCatalog.module.css";

export function CourseThumbnail({ url, title }: { url: string | null; title: string }) {
  return (
    <div className={styles.thumbnail}>
      <span className={styles.imageFallback}>TOEICSpace</span>
      {url && (
        <img
          src={url}
          alt={`Ảnh khóa học ${title}`}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </div>
  );
}

export function CourseCard({ course, to }: { course: PublicCourseSummary; to: string }) {
  return (
    <Link className={styles.card} to={to} aria-label={`Xem khóa học ${course.title}`}>
      <CourseThumbnail url={course.thumbnailUrl} title={course.title} />
      <div className={styles.cardBody}>
        <h2>{course.title}</h2>
        {course.shortDescription && (
          <p className={styles.cardDescription}>{course.shortDescription}</p>
        )}
        <span className={styles.cardPrice}>Học phí: Sắp cập nhật</span>
        <div className={styles.cardMeta}>
          <div className={styles.cardTags}>
            <span className={styles.examTag}>{examLabels[course.examType]}</span>
            <span className={styles.levelTag} data-level={course.level}>
              {levelLabels[course.level]}
            </span>
          </div>
          {course.targetScore !== null && (
            <span className={styles.cardScore}>
              <Target size={15} /> {course.targetScore} điểm
            </span>
          )}
        </div>
      </div>
      <div className={styles.cardOverlay}>
        <span className={styles.overlayEyebrow}>{examLabels[course.examType]}</span>
        <h3>{course.title}</h3>
        <p>{course.shortDescription || "Khám phá nội dung và lộ trình học của khóa học này."}</p>
        <div className={styles.overlayBottom}>
          <div>
            <small>Học phí</small>
            <strong>Sắp cập nhật</strong>
          </div>
          <span className={styles.overlayAction}>
            Xem chi tiết <ArrowUpRight size={18} aria-hidden="true" />
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
