import { Clock, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { NewsCard } from "../types/news.types";
import { stageScore } from "../utils/news-catalog";
import styles from "./NewsArticleCard.module.css";

/** Article card: cover only (placeholder until there is one) + Vietnamese title + one line of info. */
export function NewsArticleCard({ card }: { card: NewsCard }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={styles.card}
      title={card.titleEn}
      onClick={() => navigate(`/games/news/${card.slug}`)}
    >
      <span className={styles.cover}>
        {card.coverUrl ? (
          <img src={card.coverUrl} alt="" loading="lazy" decoding="async" draggable={false} />
        ) : (
          <span className={styles.coverPlaceholder} aria-hidden="true">
            <ImageIcon size={26} />
          </span>
        )}
        {card.isNew && <span className={styles.newBadge}>Mới</span>}
        {card.progress > 0 && (
          <span
            className={`${styles.progress} ${card.progress >= 100 ? styles.progressDone : ""}`}
            style={{ width: `${card.progress}%` }}
          />
        )}
      </span>
      <span className={styles.title}>{card.titleVi}</span>
      <span className={styles.meta}>
        <span className={styles.level} data-stage={card.stage}>
          TOEIC {stageScore(card.stage)}
        </span>
        <span>
          <Clock size={11} aria-hidden="true" /> {card.minutes} phút
        </span>
        <span className={styles.source}>{card.sourceName}</span>
      </span>
    </button>
  );
}

/** Placeholder card while a row is loading. */
export function NewsArticleCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <span className={styles.cover} />
      <span className={styles.title}>
        <i />
      </span>
      <span className={styles.meta}>
        <i />
      </span>
    </div>
  );
}
