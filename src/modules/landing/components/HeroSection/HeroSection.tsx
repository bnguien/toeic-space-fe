import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import mascotHero from "@/assets/mascot/oy2-playful.png";
import {
  IconBook,
  IconHeadphones,
  IconRoadmap,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
} from "../icons/LandingIcons";
import { MAIN_FEATURE_CARDS } from "../../constants";
import styles from "./HeroSection.module.css";

interface HeroSectionProps {
  onSelectFeature?: (targetId: string) => void;
}

export const HeroSection = ({ onSelectFeature }: HeroSectionProps) => {
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = Main Hero, 1 = Bốn nhóm tính năng chính
  const [isPaused, setIsPaused] = useState(false);

  // Auto-switch between slides every 5.5s (pauses when user hovers over section)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused, currentSlide]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 1 ? 0 : 1));
  };

  const handleFeatureClick = (targetId: string) => {
    if (onSelectFeature) {
      onSelectFeature(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

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

  return (
    <section
      id="hero"
      className={styles.heroSection}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.heroOverlay} aria-hidden="true" />

      {/* Slider Track with 2 Slides */}
      <div
        className={styles.sliderTrack}
        style={{ transform: `translateX(-${currentSlide * 50}%)` }}
      >
        {/* ======================================================== */}
        {/* SLIDE 1: MAIN HERO (Screenshot 5)                        */}
        {/* ======================================================== */}
        <div className={styles.slide}>
          <div className={styles.slide1Inner}>
            {/* Left Column: Typography & CTA */}
            <div className={styles.leftCol}>
              <span className={styles.subTag}>NỀN TẢNG LUYỆN THI TOEIC</span>
              <h1 className={styles.heroTitle}>TOEICSpace</h1>
              <p className={styles.heroDesc}>
                Ngoài kia sóng vẫn ồn ào. Trong này chỉ có bạn, một viên ngọc đang lớn dần sau mỗi
                buổi học.
              </p>

              <Link to="/register" className={styles.ctaButton}>
                Bắt đầu học miễn phí
              </Link>
            </div>

            {/* Right Column: 3D Mascot in Oyster Shell */}
            <div className={styles.rightCol}>
              <div className={styles.mascotWrapper}>
                <div className={`${styles.bubble} ${styles.bubble1}`} />
                <div className={`${styles.bubble} ${styles.bubble2}`} />
                <div className={`${styles.bubble} ${styles.bubble3}`} />
                <span className={`${styles.sparkleStar} ${styles.star1}`}>✦</span>
                <span className={`${styles.sparkleStar} ${styles.star2}`}>✦</span>

                <img
                  src={mascotHero}
                  alt="Oysteic Mascot — Chú sò tinh nghịch TOEICSpace"
                  className={styles.mascotImg}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SLIDE 2: BỐN NHÓM TÍNH NĂNG CHÍNH (Screenshot 4)        */}
        {/* ======================================================== */}
        <div className={styles.slide}>
          <div className={styles.slide2Inner}>
            {/* Header */}
            <div className={styles.slide2Header}>
              <h2 className={styles.slide2Title}>Bốn nhóm tính năng chính</h2>
              <p className={styles.slide2Subtitle}>
                Mọi thứ bạn cần cho hành trình TOEIC, gói gọn trong một không gian yên tĩnh.
              </p>
            </div>

            {/* 4 Feature Cards */}
            <div className={styles.featuresGrid}>
              {MAIN_FEATURE_CARDS.map((card) => (
                <div
                  key={card.id}
                  className={styles.featureCard}
                  onClick={() => handleFeatureClick(card.targetId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleFeatureClick(card.targetId);
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
          </div>
        </div>
      </div>

      {/* Unified Persistent Slider Controls */}
      <div className={styles.sliderControlsContainer}>
        <div className={styles.sliderControlsInner}>
          <div className={styles.sliderControls}>
            <button
              type="button"
              className={styles.sliderArrow}
              onClick={handlePrevSlide}
              aria-label="Slide trước"
              title="Slide trước"
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.sliderArrow}
              onClick={handleNextSlide}
              aria-label="Slide tiếp theo"
              title="Slide tiếp theo"
            >
              <IconChevronRight size={16} />
            </button>

            <div className={styles.paginationTrack} aria-label="Chuyển slide">
              <button
                type="button"
                className={currentSlide === 0 ? styles.pillDot : styles.roundDot}
                onClick={() => setCurrentSlide(0)}
                aria-label="Slide 1: Trang chủ"
                title="Slide 1: Trang chủ"
              />
              <button
                type="button"
                className={currentSlide === 1 ? styles.pillDot : styles.roundDot}
                onClick={() => setCurrentSlide(1)}
                aria-label="Slide 2: Bốn nhóm tính năng chính"
                title="Slide 2: Bốn nhóm tính năng chính"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
