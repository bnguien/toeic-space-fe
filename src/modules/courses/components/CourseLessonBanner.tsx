import readingMascot from "@/assets/mascot/oy2-reading.png";
import styles from "./CourseLessonBanner.module.css";

interface CourseLessonBannerProps {
  kicker: string;
  title: string;
  pill: string;
  sub: string;
  small?: string;
}

export function CourseLessonBanner({ kicker, title, pill, sub, small }: CourseLessonBannerProps) {
  return (
    <header className={styles.hero}>
      <div className={`${styles.ring} ${styles.ringSun}`} />
      <div className={`${styles.ring} ${styles.ringA}`} />
      <div className={`${styles.ring} ${styles.ringB}`} />
      <div className={`${styles.ring} ${styles.ringC}`} />
      <div className={styles.dots} />
      <img className={styles.mascot} src={readingMascot} alt="" width="180" height="180" />
      <div className={styles.text}>
        <div className={styles.kicker}>{kicker}</div>
        <div className={styles.title}>
          {title} <em>{pill}</em>
        </div>
        <div className={styles.sub}>
          {sub}
          {small && <small>{small}</small>}
        </div>
      </div>
    </header>
  );
}
