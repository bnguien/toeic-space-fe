import { IconBook, IconHeadphones, IconRoadmap, IconSparkles } from "../icons/LandingIcons";
import { MAIN_FEATURE_CARDS } from "../../constants";
import styles from "./FeatureCarousel.module.css";

interface FeatureCarouselProps {
  onSelectFeature?: (targetId: string) => void;
  onPrevSlide?: () => void;
  onNextSlide?: () => void;
}

export const FeatureCarousel = ({
  onSelectFeature,
  onPrevSlide,
  onNextSlide,
}: FeatureCarouselProps) => {
  const getBadgeIcon = (iconType: string) => {
    switch (iconType) {
      case "listening":
        return <IconHeadphones size={24} />;
      case "reading":
        return <IconBook size={24} />;
      case "roadmap":
        return <IconRoadmap size={24} />;
      case "ai":
        return <IconSparkles size={24} />;
      default:
        return <IconHeadphones size={24} />;
    }
  };

  const getBadgeClass = (iconType: string) => {
    switch (iconType) {
      case "listening":
        return styles.badgeListening;
      case "reading":
        return styles.badgeReading;
      case "roadmap":
        return styles.badgeRoadmap;
      case "ai":
        return styles.badgeAi;
      default:
        return styles.badgeListening;
    }
  };

  const handleCardClick = (targetId: string) => {
    if (onSelectFeature) {
      onSelectFeature(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <section id="features" className={styles.section}>
      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.inner}>
        {/* Section Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Bốn nhóm tính năng chính</h2>
          <p className={styles.subtitle}>
            Mọi thứ bạn cần cho hành trình TOEIC, gói gọn trong một không gian yên tĩnh.
          </p>
        </div>

        {/* 4 Feature Cards */}
        <div className={styles.cardsGrid}>
          {MAIN_FEATURE_CARDS.map((card) => (
            <div
              key={card.id}
              className={styles.card}
              onClick={() => handleCardClick(card.targetId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(card.targetId);
                }
              }}
            >
              <div className={`${styles.iconBadge} ${getBadgeClass(card.icon)}`}>
                {getBadgeIcon(card.icon)}
              </div>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardSubtitle}>{card.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Bottom Carousel Navigation Controls */}
        <div className={styles.bottomControls}>
          <button
            type="button"
            className={styles.navArrow}
            onClick={onPrevSlide}
            aria-label="Nhóm tính năng trước"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.navArrow}
            onClick={onNextSlide}
            aria-label="Nhóm tính năng sau"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className={styles.dotsWrapper} aria-hidden="true">
            <span className={styles.roundDot} onClick={onPrevSlide} />
            <span className={styles.activePill} />
            <span className={styles.roundDot} onClick={onNextSlide} />
          </div>
        </div>
      </div>
    </section>
  );
};
