import { ArrowUpRight } from "lucide-react";
import mascot from "@/assets/mascot/oy2-confused.png";
import styles from "./courseCatalog.module.css";

export function CourseLevelCta() {
  return (
    <div className={styles.levelCtaWrap}>
      <img className={styles.levelCtaMascot} src={mascot} alt="" aria-hidden="true" />
      <section className={styles.levelCta} aria-labelledby="course-level-cta-title">
        <div className={styles.levelCtaCopy}>
          <h2 id="course-level-cta-title">Chưa biết khóa học nào phù hợp?</h2>
          <p>Kiểm tra trình độ TOEIC để tìm lộ trình dành riêng cho bạn.</p>
        </div>
        <div className={styles.levelCtaAction}>
          <button type="button" disabled>
            Kiểm tra ngay <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
