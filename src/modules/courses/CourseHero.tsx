import type { ReactNode } from "react";
import mascotReading from "@/assets/mascot/oy2-reading.png";
import styles from "./courseCatalog.module.css";

export function CourseHero({
  eyebrow,
  title,
  description,
  children,
  footer,
  detail = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
  detail?: boolean;
}) {
  return (
    <section
      className={`${styles.catalogHero} ${detail ? styles.detailHero : ""}`}
      aria-labelledby="course-hero-title"
    >
      <span className={styles.catalogRings} aria-hidden="true" />
      <div className={styles.catalogHeroInner}>
        <div className={styles.catalogIntro}>
          <span className={styles.catalogBreadcrumb}>{eyebrow}</span>
          <h1 id="course-hero-title">{title}</h1>
          <p>{description}</p>
          {children}
        </div>
        <div className={styles.catalogIllustration} aria-hidden="true">
          <span className={styles.mascotBurst} />
          <div className={styles.mascotFrame}>
            <img src={mascotReading} alt="" />
          </div>
          <span className={styles.mascotSticker}>HỌC CÙNG OYSTEIC ✦</span>
        </div>
        {footer && <div className={styles.courseHeroFooter}>{footer}</div>}
      </div>
    </section>
  );
}
