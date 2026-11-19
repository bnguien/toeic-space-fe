/**
 * Game-mode picker shown when a course is clicked on the topic map: Basic / Pro radio cards,
 * lofi music / typing sound / feedback sound toggles, and the Start button. Presentational only —
 * the parent opens it with the picked course and receives the chosen options on Start.
 */
import { useState, type KeyboardEvent } from "react";
import { Headphones, Music, Volume2, X, Zap } from "lucide-react";

import { DICTATION_MODAL_ATTRIBUTE } from "./maps.constants";
import type {
  DictationGameMode,
  DictationMapCourse,
  DictationSoundSettings,
  DictationStartOptions,
} from "./maps.types";
import styles from "./DictationModeModal.module.css";

export interface DictationModeModalProps {
  course: DictationMapCourse;
  /** Difficulty label in the subtitle, e.g. "TOEIC 450+" (Studychill: `toeicLabel(pack)`). */
  levelLabel?: string;
  /** Initial selection; hand the last chosen options back to keep them between opens, as Studychill's page did. */
  defaultMode?: DictationGameMode;
  defaultSounds?: Partial<DictationSoundSettings>;
  onClose: () => void;
  onStart: (course: DictationMapCourse, options: DictationStartOptions) => void;
}

export function DictationModeModal({
  course,
  levelLabel,
  defaultMode = "basic",
  defaultSounds,
  onClose,
  onStart,
}: DictationModeModalProps) {
  const [gameMode, setGameMode] = useState<DictationGameMode>(defaultMode);
  const [bgmEnabled, setBgmEnabled] = useState(defaultSounds?.bgmEnabled ?? true);
  const [typingSoundEnabled, setTypingSoundEnabled] = useState(
    defaultSounds?.typingSoundEnabled ?? true,
  );
  const [feedbackSoundEnabled, setFeedbackSoundEnabled] = useState(
    defaultSounds?.feedbackSoundEnabled ?? true,
  );

  const handleStart = () => {
    onStart(course, { mode: gameMode, bgmEnabled, typingSoundEnabled, feedbackSoundEnabled });
  };

  const pickOnKey = (mode: DictationGameMode) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setGameMode(mode);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      {...{ [DICTATION_MODAL_ATTRIBUTE]: "" }}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>

        <div className={styles.badge}>
          <Headphones size={13} />
          <span>Chặng đua Dictation · Màn {course.order || 1}</span>
        </div>

        <h3 className={styles.title}>{course.title}</h3>
        <p className={styles.subtitle}>
          Gồm {course.statementCount || 30} câu thực chiến · Độ khó: {levelLabel || "TOEIC 450+"}
        </p>

        {/* Game mode */}
        <div className={styles.modeOptions} role="radiogroup" aria-label="Chế độ chơi">
          {/* Mode 1: basic dictation */}
          <div
            className={`${styles.modeCard} ${gameMode === "basic" ? styles.modeCardSelected : ""}`}
            role="radio"
            aria-checked={gameMode === "basic"}
            tabIndex={0}
            onClick={() => setGameMode("basic")}
            onKeyDown={pickOnKey("basic")}
          >
            <div className={styles.radioCircle}>
              {gameMode === "basic" && <div className={styles.radioDot} />}
            </div>
            <div className={styles.modeInfo}>
              <div className={styles.modeName}>
                <span>Nghe chép Cơ bản</span>
                <span className={`${styles.modeTag} ${styles.modeTagBasic}`}>🌱 Khuyên dùng</span>
              </div>
              <p className={styles.modeDescription}>
                Tự động hiện nghĩa tiếng Việt. Lộ trình 3 nấc tự nhiên: Từ vựng → Cụm cấu trúc → Cả
                câu hoàn chỉnh. Dễ thở và nhớ sâu.
              </p>
            </div>
          </div>

          {/* Mode 2: pro dictation */}
          <div
            className={`${styles.modeCard} ${styles.modeCardPro} ${gameMode === "pro" ? styles.modeCardSelected : ""}`}
            role="radio"
            aria-checked={gameMode === "pro"}
            tabIndex={0}
            onClick={() => setGameMode("pro")}
            onKeyDown={pickOnKey("pro")}
          >
            <div className={styles.radioCircle}>
              {gameMode === "pro" && <div className={styles.radioDot} />}
            </div>
            <div className={styles.modeInfo}>
              <div className={styles.modeName}>
                <span>Nghe chép Nâng cao (Pro)</span>
                <span className={`${styles.modeTag} ${styles.modeTagPro}`}>⚡ Thử thách</span>
              </div>
              <p className={styles.modeDescription}>
                Ẩn toàn bộ trợ giúp. Nghe audio gốc và viết lại chính xác 100%. Luyện phản xạ đôi
                tai cực mạnh cho phòng thi TOEIC.
              </p>
            </div>
          </div>
        </div>

        {/* Sound effects & music */}
        <div className={styles.soundBox}>
          <div className={styles.soundHead}>
            <Music size={15} />
            <span>Hiệu ứng Âm thanh &amp; Nhạc nền</span>
          </div>
          <div className={styles.soundToggles}>
            <button
              type="button"
              className={`${styles.togglePill} ${bgmEnabled ? styles.togglePillActive : ""}`}
              aria-pressed={bgmEnabled}
              onClick={() => setBgmEnabled(!bgmEnabled)}
            >
              <Music size={13} />
              <span>{bgmEnabled ? "Nhạc Lofi: Bật" : "Nhạc Lofi: Tắt"}</span>
            </button>
            <button
              type="button"
              className={`${styles.togglePill} ${typingSoundEnabled ? styles.togglePillActive : ""}`}
              aria-pressed={typingSoundEnabled}
              onClick={() => setTypingSoundEnabled(!typingSoundEnabled)}
            >
              <Zap size={13} />
              <span>{typingSoundEnabled ? "Âm gõ: Bật" : "Âm gõ: Tắt"}</span>
            </button>
            <button
              type="button"
              className={`${styles.togglePill} ${feedbackSoundEnabled ? styles.togglePillActive : ""}`}
              aria-pressed={feedbackSoundEnabled}
              onClick={() => setFeedbackSoundEnabled(!feedbackSoundEnabled)}
            >
              <Volume2 size={13} />
              <span>{feedbackSoundEnabled ? "Âm đúng/sai: Bật" : "Âm đúng/sai: Tắt"}</span>
            </button>
          </div>
        </div>

        {/* Start */}
        <button type="button" className={styles.startButton} onClick={handleStart}>
          <span>Bắt đầu hành trình cùng Oysteic 🚀</span>
        </button>
      </div>
    </div>
  );
}
