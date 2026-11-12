import { useState } from "react";
import { Link } from "react-router-dom";
import mascotFocus from "@/assets/mascot/oy2-focus.png";
import { IconSpeaker, IconSparkles, IconZap, IconTarget } from "../icons/LandingIcons";
import { VOCABULARY_LIST } from "../../constants";
import styles from "./VocabularySection.module.css";

export const VocabularySection = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentWord = VOCABULARY_LIST[wordIndex];

  const handlePrevWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setWordIndex((prev) => (prev > 0 ? prev - 1 : VOCABULARY_LIST.length - 1));
  };

  const handleNextWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setWordIndex((prev) => (prev < VOCABULARY_LIST.length - 1 ? prev + 1 : 0));
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <section id="vocabulary" className={styles.section}>
      <div className={styles.inner}>
        {/* Section Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <div className={styles.badgePill}>
              <span className={styles.badgeNumber}>04</span>
              <span className={styles.badgeLabel}>TỪ VỰNG & TRỢ LÝ AI</span>
            </div>
            <h2 className={styles.title}>Học từ vựng cùng Oysteic AI</h2>
            <p className={styles.subtitle}>
              Nhớ từ vựng siêu tốc qua ngữ cảnh thực tế, lặp lại ngắt quãng (Spaced Repetition) và
              mẹo nhớ độc quyền từ chú sò Oysteic.
            </p>
          </div>

          <div className={styles.mascotWrap}>
            <img
              src={mascotFocus}
              alt="Oysteic Mascot — Tập trung học từ vựng"
              className={styles.mascotImg}
            />
          </div>
        </div>

        {/* Content Two Columns */}
        <div className={styles.contentGrid}>
          {/* Left Column: Interactive 3D Flashcard Deck */}
          <div>
            <div className={styles.flashcardStackWrapper}>
              {/* Stacked background cards behind (Deck effect) */}
              <div className={`${styles.deckCard} ${styles.deckCard3}`} aria-hidden="true" />
              <div className={`${styles.deckCard} ${styles.deckCard2}`} aria-hidden="true" />
              <div className={`${styles.deckCard} ${styles.deckCard1}`} aria-hidden="true" />

              {/* Main Active 3D Flashcard */}
              <div
                className={styles.flashcardCard}
                onClick={() => setIsFlipped((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsFlipped((prev) => !prev);
                  }
                }}
                aria-label="Nhấn để lật thẻ từ vựng"
              >
                <div className={`${styles.cardInner} ${isFlipped ? styles.cardFlipped : ""}`}>
                  {/* Front Side */}
                  <div className={styles.cardFront}>
                    <div className={styles.cardHeaderRow}>
                      <span className={styles.wordTypeBadge}>{currentWord.type}</span>
                      <button
                        type="button"
                        className={styles.speakerBtn}
                        onClick={handleSpeak}
                        title="Nghe phát âm chuẩn"
                        aria-label="Phát âm"
                      >
                        <IconSpeaker size={18} />
                      </button>
                    </div>

                    <div className={styles.vocabMain}>
                      <div className={styles.vocabWord}>{currentWord.word}</div>
                      <div className={styles.vocabPhonetic}>{currentWord.phonetic}</div>
                      <div className={styles.vocabMeaning}>{currentWord.meaning}</div>
                    </div>

                    <div className={styles.cardHintFlip}>
                      <span>✦ Nhấn vào thẻ để xem ngữ cảnh & mẹo AI ✦</span>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className={styles.cardBack}>
                    <div className={styles.cardHeaderRow}>
                      <span className={styles.wordTypeBadge}>Ngữ cảnh đề thi TOEIC</span>
                      <button
                        type="button"
                        className={styles.speakerBtn}
                        onClick={handleSpeak}
                        aria-label="Phát âm"
                      >
                        <IconSpeaker size={18} />
                      </button>
                    </div>

                    <div>
                      <div className={styles.backTitle}>Ví dụ thực tế:</div>
                      <p className={styles.backExampleEn}>"{currentWord.example}"</p>
                      <p className={styles.backExampleVi}>{currentWord.exampleTranslation}</p>
                      <div className={styles.aiTipBox}>💡 {currentWord.aiTip}</div>
                    </div>

                    <div className={styles.cardHintFlip}>
                      <span>✦ Nhấn để quay lại mặt trước ✦</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className={styles.cardNavRow}>
              <button type="button" className={styles.vocabNavBtn} onClick={handlePrevWord}>
                ← Từ trước
              </button>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#64748b",
                }}
              >
                {wordIndex + 1} / {VOCABULARY_LIST.length}
              </span>
              <button type="button" className={styles.vocabNavBtn} onClick={handleNextWord}>
                Từ tiếp theo →
              </button>
            </div>
          </div>

          {/* Right Column: AI Highlights */}
          <div className={styles.featuresCol}>
            <div className={styles.featureItemCard}>
              <div className={styles.featureIconCircle}>
                <IconSparkles size={18} />
              </div>
              <div className={styles.featureText}>
                <h4>Tra từ 1-chạm & Nhận diện ngữ cảnh</h4>
                <p>
                  Khi làm bài nghe hay đọc, chạm vào bất kỳ từ mới nào để xem ngay nghĩa chuyên biệt
                  trong kỳ thi TOEIC ETS.
                </p>
              </div>
            </div>

            <div className={styles.featureItemCard}>
              <div className={styles.featureIconCircle}>
                <IconZap size={18} />
              </div>
              <div className={styles.featureText}>
                <h4>Mẹo ghi nhớ từ vựng độc quyền</h4>
                <p>
                  Tách gốc từ (prefix, root, suffix) và liên tưởng hài hước giúp bạn ghi nhớ từ mới
                  chỉ sau 1 lần đọc.
                </p>
              </div>
            </div>

            <div className={styles.featureItemCard}>
              <div className={styles.featureIconCircle}>
                <IconTarget size={18} />
              </div>
              <div className={styles.featureText}>
                <h4>Thuật toán Spaced Repetition (Lặp lại ngắt quãng)</h4>
                <p>
                  Tự động xếp lịch ôn tập những từ bạn hay quên vào các mốc 1 ngày, 3 ngày, 7 ngày
                  đến khi đạt độ thành thạo 100%.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View More / Detail Link */}
        <div className={styles.viewMoreRow}>
          <Link to="/vocabulary" className={styles.viewMoreBtn}>
            <span>Xem thêm kho 3.000+ từ vựng & phương pháp Spaced Repetition</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
