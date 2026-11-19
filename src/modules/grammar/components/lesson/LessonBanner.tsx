import { sticker } from "../../utils/grammar-assets";
import { cx } from "../../utils/cx";
import styles from "./LessonBanner.module.css";

interface LessonBannerProps {
  kicker: string;
  title: string;
  pill: string;
  sub: string;
  small?: string;
}

/** Cover banner (the PDF hero), compact for the web. */
export function LessonBanner({ kicker, title, pill, sub, small }: LessonBannerProps) {
  return (
    <header className={styles.hero}>
      <div className={cx(styles.ring, styles.ringSun)} />
      <div className={cx(styles.ring, styles.ringA)} />
      <div className={cx(styles.ring, styles.ringB)} />
      <div className={cx(styles.ring, styles.ringC)} />
      <div className={styles.dots} />
      <img className={styles.mascot} src={sticker("reading")} alt="" width="180" height="180" />
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
