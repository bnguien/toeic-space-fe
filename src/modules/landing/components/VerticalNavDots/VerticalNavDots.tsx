import { SECTION_NAV_DOTS } from "../../constants";
import styles from "./VerticalNavDots.module.css";

interface VerticalNavDotsProps {
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
}

export const VerticalNavDots = ({ activeSection, onSelectSection }: VerticalNavDotsProps) => {
  return (
    <nav className={styles.container} aria-label="Điều hướng các phần trang">
      <div className={styles.trackLine} aria-hidden="true" />
      {SECTION_NAV_DOTS.map((dot) => {
        const isActive = activeSection === dot.id;
        return (
          <button
            key={dot.id}
            type="button"
            className={`${styles.dotButton} ${isActive ? styles.dotActive : ""}`}
            onClick={() => onSelectSection(dot.id)}
            aria-label={`Chuyển tới ${dot.label}`}
            aria-current={isActive ? "true" : undefined}
          >
            <span className={styles.dotCore} />
            <span className={styles.tooltip}>{dot.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
