import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import styles from "./BackToTop.module.css";

export const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  // Automatically reset scroll position on page/route navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Monitor scroll position to show/hide the back to top button
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 320);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      className={`${styles.backToTopBtn} ${isVisible ? styles.visible : ""}`}
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
    >
      <ArrowUp size={20} strokeWidth={2.5} className={styles.icon} />
    </button>
  );
};
