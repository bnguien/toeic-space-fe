import { Link } from "react-router-dom";
import { PARTNER_INSTITUTIONS } from "../../constants";
import styles from "./EcosystemSection.module.css";

export const EcosystemSection = () => {
  return (
    <section id="ecosystem" className={styles.section}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badgePill}>
            <span className={styles.badgeNumber}>06</span>
            <span className={styles.badgeLabel}>HỆ SINH THÁI</span>
          </div>
          <h2 className={styles.title}>Được tin chọn bởi hơn 50.000+ học viên</h2>
          <p className={styles.subtitle}>
            ToeicSpace đồng hành cùng sinh viên và người đi làm tại các trường đại học, tổ chức uy
            tín khắp cả nước.
          </p>
        </div>

        {/* 4 Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>50.000+</div>
            <div className={styles.statLabel}>Học viên tích cực ôn luyện</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>94.8%</div>
            <div className={styles.statLabel}>Đạt và vượt mục tiêu cam kết</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>10.000+</div>
            <div className={styles.statLabel}>Câu hỏi có giải thích chi tiết</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>4.9 / 5</div>
            <div className={styles.statLabel}>Đánh giá hài lòng từ học viên</div>
          </div>
        </div>

        {/* Partner University Badges */}
        <div className={styles.partnersGrid}>
          {PARTNER_INSTITUTIONS.map((inst) => (
            <div key={inst.name} className={styles.partnerBadge}>
              <div className={styles.partnerName}>{inst.name}</div>
              <div className={styles.partnerCode}>{inst.code}</div>
            </div>
          ))}
        </div>

        {/* View More / Detail Link */}
        <div className={styles.viewMoreRow}>
          <Link to="/about" className={styles.viewMoreBtn}>
            <span>Xem chi tiết mạng lưới đối tác & câu chuyện học viên</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
