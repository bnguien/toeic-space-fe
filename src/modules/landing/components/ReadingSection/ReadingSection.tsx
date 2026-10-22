import { useState } from "react";
import { Link } from "react-router-dom";
import mascotReading from "@/assets/mascot/oy2-reading.png";
import { IconBook } from "../icons/LandingIcons";
import { READING_PARTS } from "../../constants";
import styles from "./ReadingSection.module.css";

export const ReadingSection = () => {
  const [selectedPartIndex, setSelectedPartIndex] = useState(0); // Default Part 5
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const currentPart = READING_PARTS[selectedPartIndex];

  const handleSelectPart = (idx: number) => {
    setSelectedPartIndex(idx);
    setSelectedOption(null);
  };

  const handleSelectOption = (key: string) => {
    setSelectedOption(key);
  };

  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === currentPart.correctOption;

  return (
    <section id="reading" className={styles.section}>
      <div className={styles.inner}>
        {/* Section Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <div className={styles.badgePill}>
              <span className={styles.badgeNumber}>02</span>
              <span className={styles.badgeLabel}>PHÒNG LUYỆN TẬP</span>
            </div>
            <h2 className={styles.title}>Đọc như lật từng trang sổ</h2>
            <p className={styles.subtitle}>
              Part 5 đến Part 7 được dựng như những trang giấy kẻ chấm: câu hỏi bên trái, ghi chú
              giải thích bên phải.
            </p>
          </div>

          {/* Right Mascot: Cute Pearl with glasses reading book */}
          <div className={styles.mascotWrap}>
            <img
              src={mascotReading}
              alt="Oysteic Mascot — Đọc như lật từng trang sổ"
              className={styles.mascotImg}
            />
          </div>
        </div>

        {/* Content Two Columns */}
        <div className={styles.contentGrid}>
          {/* Left Column: 3 Part Selectors */}
          <div className={styles.selectorList}>
            {READING_PARTS.map((item, idx) => {
              const isSelected = idx === selectedPartIndex;
              return (
                <div
                  key={item.id}
                  className={`${styles.selectorCard} ${
                    isSelected ? styles.selectorCardActive : ""
                  }`}
                  onClick={() => handleSelectPart(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectPart(idx);
                    }
                  }}
                >
                  <div className={styles.selectorIcon}>
                    <IconBook size={22} />
                  </div>
                  <div className={styles.selectorInfo}>
                    <h3 className={styles.selectorTitle}>{item.title}</h3>
                    <p className={styles.selectorSubtitle}>{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Dotted Notebook Paper Sheet */}
          <div className={styles.notebookSheet}>
            <div className={styles.sheetHeader}>{currentPart.questionLabel}</div>
            <div className={styles.sheetQuestion}>{currentPart.questionText}</div>

            {/* 4 Options */}
            <div className={styles.optionsList}>
              {currentPart.options.map((opt) => {
                const isSelected = selectedOption === opt.key;
                const isThisCorrect = opt.key === currentPart.correctOption;

                let pillStateClass = "";
                if (isAnswered) {
                  if (isSelected) {
                    pillStateClass = isThisCorrect ? styles.optionCorrect : styles.optionIncorrect;
                  } else if (isThisCorrect) {
                    pillStateClass = styles.optionCorrect;
                  }
                }

                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`${styles.optionPill} ${pillStateClass}`}
                    onClick={() => handleSelectOption(opt.key)}
                  >
                    <span className={styles.optionCircle}>{opt.key}</span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Tip Bar */}
            <div
              className={`${styles.sheetBottomTip} ${
                isAnswered ? styles.sheetBottomTipActive : ""
              }`}
            >
              {!isAnswered ? (
                "Chọn một đáp án để xem giải thích của Oysteic."
              ) : isCorrect ? (
                <span>🎉 {currentPart.explanation}</span>
              ) : (
                <span>
                  💡 Chưa chính xác! Đáp án đúng là ({currentPart.correctOption}).{" "}
                  {currentPart.explanation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View More / Detail Link */}
        <div className={styles.viewMoreRow}>
          <Link to="/practice" className={styles.viewMoreBtn}>
            <span>Xem chi tiết phòng luyện Reading (Part 5–7 có giải thích)</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
