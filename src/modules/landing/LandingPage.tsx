import { useEffect, useState } from "react";
import { VerticalNavDots } from "./components/VerticalNavDots/VerticalNavDots";
import { HeroSection } from "./components/HeroSection/HeroSection";
import { ListeningSection } from "./components/ListeningSection/ListeningSection";
import { ReadingSection } from "./components/ReadingSection/ReadingSection";
import { RoadmapSection } from "./components/RoadmapSection/RoadmapSection";
import { VocabularySection } from "./components/VocabularySection/VocabularySection";
import { CourseSection } from "./components/CourseSection/CourseSection";
import { EcosystemSection } from "./components/EcosystemSection/EcosystemSection";
import { CtaSection } from "./components/CtaSection/CtaSection";
import { Footer } from "./components/Footer/Footer";
import { SECTION_NAV_DOTS } from "./constants";
import styles from "./LandingPage.module.css";

export const LandingPage = () => {
  const [activeSection, setActiveSection] = useState("hero");

  const scrollToSection = (sectionId: string) => {
    let target = document.getElementById(sectionId);
    if (!target && sectionId === "practice") {
      target = document.getElementById("listening");
    }
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionId);
    }
  };

  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      // Find the most visible section
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        const id = visible[0].target.id;
        setActiveSection(id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-20% 0px -40% 0px",
      threshold: [0.1, 0.3, 0.6],
    });

    SECTION_NAV_DOTS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        let target = document.getElementById(hash);
        if (!target && hash === "practice") {
          target = document.getElementById("listening");
        }
        if (target) {
          setTimeout(() => {
            target?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <div className={styles.landingContainer}>
      {/* Fixed Left Vertical Dots Navigation Indicator */}
      <VerticalNavDots activeSection={activeSection} onSelectSection={scrollToSection} />

      <div className={styles.contentWrapper}>
        {/* Screenshot 5 & 4: Hero Section with 2-slide carousel */}
        <HeroSection onSelectFeature={scrollToSection} />

        {/* Screenshot 2: 01 PHÒNG LUYỆN TẬP - Listening */}
        <div id="practice">
          <ListeningSection />
        </div>

        {/* Screenshot 1: 02 PHÒNG LUYỆN TẬP - Reading */}
        <ReadingSection />

        {/* Screenshot 3: 03 CÁ NHÂN HOÁ - Roadmap */}
        <RoadmapSection />

        {/* Vocabulary & AI Section */}
        <VocabularySection />

        {/* Courses Section */}
        <CourseSection />

        {/* Ecosystem & Partner Section */}
        <EcosystemSection />

        {/* CTA Banner */}
        <CtaSection onScrollToPractice={() => scrollToSection("listening")} />

        {/* Footer */}
        <Footer onNavClick={scrollToSection} />
      </div>
    </div>
  );
};
