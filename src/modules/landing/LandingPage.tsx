import { useEffect, useState } from "react";

import { useColorModeScope } from "@/shared/hooks/useColorMode";

import { FeaturedCoursesSection } from "./components/FeaturedCoursesSection/FeaturedCoursesSection";
import { Footer } from "./components/Footer/Footer";
import { GrammarRoadmapSection } from "./components/GrammarRoadmapSection/GrammarRoadmapSection";
import { HeroSection } from "./components/HeroSection/HeroSection";
import { SiteMapSection } from "./components/SiteMapSection/SiteMapSection";
import { VerticalNavDots } from "./components/VerticalNavDots/VerticalNavDots";
import { SECTION_NAV_DOTS } from "./constants";
import styles from "./LandingPage.module.css";
import { goToSection } from "./utils/goToSection";

/** Home page: hero, site map, grammar roadmap, featured courses, footer. */
export const LandingPage = () => {
  useColorModeScope();
  const [activeSection, setActiveSection] = useState("hero");

  const scrollToSection = (sectionId: string) => {
    if (goToSection(sectionId)) setActiveSection(sectionId);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { root: null, rootMargin: "-20% 0px -40% 0px", threshold: [0.1, 0.3, 0.6] },
    );
    SECTION_NAV_DOTS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Deep links such as "/#ngu-phap" scroll to their section.
  useEffect(() => {
    const handleHash = () => {
      const target = document.getElementById(window.location.hash.replace("#", ""));
      if (target) window.setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 100);
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <div className={styles.landingContainer}>
      <VerticalNavDots activeSection={activeSection} onSelectSection={scrollToSection} />

      <main className={styles.contentWrapper}>
        <HeroSection onSelectFeature={scrollToSection} />
        <SiteMapSection />
        <GrammarRoadmapSection />
        <FeaturedCoursesSection />
      </main>
      <Footer onNavClick={scrollToSection} />
    </div>
  );
};
