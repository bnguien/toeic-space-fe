import { Eye, EyeOff } from "lucide-react";

import {
  LISTEN_MODES,
  WORD_TIERS,
  type ListenMode,
  type WordTierKey,
} from "../utils/subtitle-reading";
import styles from "./ReaderModeBar.module.css";

const TIER_CLASS: Record<WordTierKey, string> = {
  toeic: styles.levelToeic,
  b2: styles.levelB2,
  c1: styles.levelC1,
};

interface ReaderModeBarProps {
  mode: ListenMode;
  onMode: (mode: ListenMode) => void;
  clozeScore: { correct: number; total: number };
  rewriteScore: { correct: number; clean: number; total: number };
  showTranslation: boolean;
  onToggleTranslation: () => void;
  hasLevels: boolean;
  highlightTiers: string;
  onToggleTier: (tier: WordTierKey) => void;
}

export function ReaderModeBar({
  mode,
  onMode,
  clozeScore,
  rewriteScore,
  showTranslation,
  onToggleTranslation,
  hasLevels,
  highlightTiers,
  onToggleTier,
}: ReaderModeBarProps) {
  const isCloze = mode === "cloze";
  const isRewrite = mode === "rewrite";
  return (
    <div className={styles.modebar}>
      <div className={styles.inner}>
        <div className={styles.segmented} role="radiogroup" aria-label="Chế độ nghe">
          {LISTEN_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={mode === m.key}
              onClick={() => onMode(m.key)}
              title={`${m.description} (S để đổi)`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {isCloze && (
          <span
            className={styles.score}
            role="status"
            title="Số ô điền đúng / số ô đã xong trong lần xem này"
          >
            <span>
              Đúng <b>{clozeScore.correct}</b>
              {`/${clozeScore.total}`}
            </span>
            <span className={styles.scoreHint}>· gõ rồi Enter</span>
          </span>
        )}
        {isRewrite && (
          <span
            className={styles.score}
            role="status"
            title="Câu viết đúng / câu đã xong trong lần xem này"
          >
            <span>
              Đúng <b>{rewriteScore.correct}</b>
              {`/${rewriteScore.total} câu`}
            </span>
            {rewriteScore.clean > 0 && (
              <span className={styles.scoreHint}>
                {`· ${rewriteScore.clean} câu chuẩn ngay lần đầu`}
              </span>
            )}
          </span>
        )}
        {(isCloze || isRewrite) && (
          <button
            type="button"
            className={styles.meaning}
            onClick={onToggleTranslation}
            aria-pressed={showTranslation}
            title="Hiện / ẩn nghĩa tiếng Việt (chung với Cài đặt › Bản dịch câu)"
          >
            {showTranslation ? (
              <Eye size={15} aria-hidden="true" />
            ) : (
              <EyeOff size={15} aria-hidden="true" />
            )}
            {showTranslation ? "Hiện nghĩa" : "Ẩn nghĩa"}
          </button>
        )}
        {hasLevels && !isCloze && !isRewrite && (
          <div className={styles.legend} role="group" aria-label="Tô từ vựng theo bậc">
            <span className={styles.legendLabel}>Tô từ</span>
            {WORD_TIERS.map((tier) => {
              const isOn = highlightTiers.includes(tier.key);
              return (
                <button
                  key={tier.key}
                  type="button"
                  className={`${styles.chip} ${TIER_CLASS[tier.key]}`}
                  aria-pressed={isOn}
                  onClick={() => onToggleTier(tier.key)}
                  title={`${tier.description} — bấm để ${isOn ? "tắt" : "bật"}`}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
