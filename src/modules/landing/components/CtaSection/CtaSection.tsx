import { Link } from "react-router-dom";
import mascotCheer from "@/assets/mascot/oy2-cheer.png";
import styles from "./CtaSection.module.css";

interface CtaSectionProps {
  onScrollToPractice?: () => void;
}

export const CtaSection = ({ onScrollToPractice }: CtaSectionProps) => {
  const handleTestClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onScrollToPractice) {
      onScrollToPractice();
    } else {
      const el = document.getElementById("practice");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.ctaCard}>
          <div className={styles.bgGlow} aria-hidden="true" />

          {/* Left Text */}
          <div className={styles.contentCol}>
            <span className={styles.badge}>BẮT ĐẦU NGAY HÔM NAY</span>
            <h2 className={styles.title}>Sẵn sàng bứt phá mục tiêu TOEIC?</h2>
            <p className={styles.desc}>
              Hàng chục ngàn học viên đã tìm thấy phương pháp học tập tĩnh lặng và hiệu quả tại
              TOEICSpace. Hãy để chú sò Oysteic đồng hành cùng bạn từ hôm nay!
            </p>

            <div className={styles.actionsRow}>
              <Link to="/register" className={styles.primaryBtn}>
                Tạo tài khoản miễn phí
              </Link>
              <button type="button" className={styles.secondaryBtn} onClick={handleTestClick}>
                Trải nghiệm luyện đề ngay
              </button>
            </div>
          </div>

          {/* Right Mascot Celebrating */}
          <div className={styles.mascotCol}>
            <img
              src={mascotCheer}
              alt="Oysteic Mascot — Cùng bứt phá mục tiêu TOEIC"
              className={styles.mascotImg}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
