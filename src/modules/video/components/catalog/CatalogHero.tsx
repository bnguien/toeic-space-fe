import heroBackground from "@/assets/mascot/sky-sea-banner.jpg";
import heroMascot from "@/assets/mascot/oy2-listening.png";

import { PasteLinkBox, type PasteLinkBoxProps } from "./PasteLinkBox";
import styles from "./CatalogHero.module.css";

export type CatalogHeroProps = Omit<PasteLinkBoxProps, "variant">;

const YOUTUBE_PATH =
  "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z";

/** Desktop hero card "Học với YouTube": title, subtitle, paste-URL box, error/note, example link. */
export function CatalogHero(props: CatalogHeroProps) {
  return (
    <section className={styles.heroCard} style={{ backgroundImage: `url(${heroBackground})` }}>
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div className={styles.youtubeBadge}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
              <path d={YOUTUBE_PATH} />
            </svg>
          </div>
          <h1 className={styles.title}>
            Học với YouTube <span className={styles.emoji}>🌿</span>
          </h1>
        </div>

        <p className={styles.subtitle}>Học từ video yêu thích với phụ đề song ngữ</p>

        <PasteLinkBox variant="hero" {...props} />
      </div>

      <img src={heroMascot} alt="" aria-hidden="true" className={styles.mascot} />
    </section>
  );
}
