import styles from "./ProfileSkeleton.module.css";

export function ProfileSkeleton() {
  return (
    <div
      className={styles.skeletonContainer}
      aria-busy="true"
      aria-label="Đang tải thông tin hồ sơ"
    >
      {/* Header skeleton */}
      <div className={styles.headerSkeleton}>
        <div className={styles.headerTextGroup}>
          <div className={`${styles.shimmer} ${styles.headerTitle}`} />
          <div className={`${styles.shimmer} ${styles.headerSubtitle}`} />
        </div>
        <div
          className={`${styles.shimmer} ${styles.pillSkeleton}`}
          style={{ width: 110, height: 38 }}
        />
      </div>

      {/* Main grid */}
      <div className={styles.gridSkeleton}>
        {/* Left column skeleton */}
        <div className={styles.cardSkeleton}>
          <div className={`${styles.shimmer} ${styles.avatarSkeleton}`} />
          <div className={`${styles.shimmer} ${styles.nameSkeleton}`} />
          <div className={`${styles.shimmer} ${styles.emailSkeleton}`} />
          <div className={styles.pillGroup}>
            <div className={`${styles.shimmer} ${styles.pillSkeleton}`} />
            <div className={`${styles.shimmer} ${styles.pillSkeleton}`} />
          </div>
          <div className={styles.statRow}>
            <div className={`${styles.shimmer} ${styles.labelSkeleton}`} style={{ width: 140 }} />
            <div className={`${styles.shimmer} ${styles.statBar}`} />
          </div>
        </div>

        {/* Right column skeleton */}
        <div className={styles.cardSkeleton}>
          <div
            className={`${styles.shimmer} ${styles.headerTitle}`}
            style={{ width: 180, height: 24 }}
          />
          <div className={styles.fieldSkeletonRow}>
            <div className={styles.fieldSkeleton}>
              <div className={`${styles.shimmer} ${styles.labelSkeleton}`} />
              <div className={`${styles.shimmer} ${styles.inputSkeleton}`} />
            </div>
            <div className={styles.fieldSkeleton}>
              <div className={`${styles.shimmer} ${styles.labelSkeleton}`} />
              <div className={`${styles.shimmer} ${styles.inputSkeleton}`} />
            </div>
          </div>
          <div className={styles.fieldSkeletonRow}>
            <div className={styles.fieldSkeleton}>
              <div className={`${styles.shimmer} ${styles.labelSkeleton}`} />
              <div className={`${styles.shimmer} ${styles.inputSkeleton}`} />
            </div>
            <div className={styles.fieldSkeleton}>
              <div className={`${styles.shimmer} ${styles.labelSkeleton}`} />
              <div className={`${styles.shimmer} ${styles.inputSkeleton}`} />
            </div>
          </div>
          <div className={styles.fieldSkeleton}>
            <div className={`${styles.shimmer} ${styles.labelSkeleton}`} />
            <div className={`${styles.shimmer} ${styles.textareaSkeleton}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
