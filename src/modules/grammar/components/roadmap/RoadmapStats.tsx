import type { ProgressStatsDto } from "../../types/grammar.types";
import { cx } from "../../utils/cx";
import styles from "./RoadmapStats.module.css";

interface RoadmapStatsProps {
  stats: ProgressStatsDto;
  onOpenReview: () => void;
}

/** Đã học · Cần ôn (opens Sổ lỗi) · Tiến độ. */
export function RoadmapStats({ stats, onOpenReview: onNeedsReview }: RoadmapStatsProps) {
  const {
    completedTopics: learned,
    reviewCount: needsReview,
    progressPercent: progressPct,
  } = stats;
  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <span className={styles.label}>
          <i className={cx(styles.dot, styles.dotLearned)} />
          Đã học
        </span>
        <strong>{learned}</strong>
        <small>chuyên đề</small>
      </div>
      <button
        type="button"
        className={cx(styles.stat, styles.statBtn)}
        onClick={onNeedsReview}
        title="Mở Sổ lỗi"
      >
        <span className={styles.label}>
          <i className={cx(styles.dot, styles.dotReview)} />
          Cần ôn
        </span>
        <strong>{needsReview}</strong>
        <small>câu</small>
      </button>
      <div className={styles.stat}>
        <span className={styles.label}>
          <i className={cx(styles.dot, styles.dotProgress)} />
          Tiến độ
        </span>
        <strong>{progressPct}%</strong>
        <span className={styles.bar}>
          <span style={{ width: `${progressPct}%` }} />
        </span>
      </div>
    </div>
  );
}
