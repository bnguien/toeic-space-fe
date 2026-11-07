import type { ReactNode } from "react";

import type { Cue, GlossEntryDto } from "../types/video.types";
import type { WordTierKey } from "../utils/subtitle-reading";
import { posLabel } from "../utils/video-lesson";
import styles from "./ReaderWordTray.module.css";

export interface NearbyWord {
  word: string;
  k: string;
  tier: WordTierKey;
  cue: Cue;
}

const TIER_CLASS: Record<WordTierKey, string> = {
  toeic: styles.levelToeic,
  b2: styles.levelB2,
  c1: styles.levelC1,
};

interface ReaderWordTrayProps {
  /** The open word card, or null. */
  wordCard: ReactNode;
  savedCount: number;
  nearbyWords: readonly NearbyWord[];
  gloss: Record<string, GlossEntryDto>;
  isTouch: boolean;
  isRewrite: boolean;
  onWord: (word: string, cue: Cue) => void;
}

/** Desktop tray under the video: the word card fills it; empty → tiered words nearby + keyboard shortcuts. */
export function ReaderWordTray({
  wordCard,
  savedCount,
  nearbyWords,
  gloss,
  isTouch,
  isRewrite,
  onWord,
}: ReaderWordTrayProps) {
  return (
    <div className={styles.panel}>
      {/* Reading settings moved to the gear (drawer) — this tray only holds the word card. */}
      <div className={styles.tabs}>
        <span className={styles.tab}>Thẻ từ</span>
        <span className={styles.tabCount}>{`Sổ từ: ${savedCount}`}</span>
      </div>

      <div className={styles.body}>
        {wordCard || (
          <div className={styles.empty}>
            {nearbyWords.length > 0 && (
              <div className={styles.near}>
                <div className={styles.nearTitle}>Từ đáng học quanh đây</div>
                <ul>
                  {nearbyWords.map((t) => (
                    <li key={t.k}>
                      <button type="button" onClick={() => onWord(t.word, t.cue)}>
                        <span className={`${styles.nearWord} ${TIER_CLASS[t.tier]}`}>{t.word}</span>
                        {gloss[t.k]?.partOfSpeech && (
                          <span className={styles.nearPartOfSpeech}>
                            {posLabel(gloss[t.k].partOfSpeech)}
                          </span>
                        )}
                        <span className={styles.nearMeaning}>{gloss[t.k]?.meaning || "…"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.emptyBig}>Bấm vào một từ để xem thẻ</div>
            <p>
              {isTouch
                ? "Chạm vào từ bất kỳ: video dừng lại và thẻ từ vựng hiện ở đây."
                : "Trỏ chuột vào từ để xem nghĩa nhanh. Bấm vào từ thì video dừng và thẻ từ hiện ở đây."}
            </p>
            {!isTouch && isRewrite && (
              <dl className={styles.keys}>
                <div>
                  <dt>
                    <kbd>Space</kbd>
                  </dt>
                  <dd>Sang từ kế (từ đúng sáng xanh)</dd>
                </div>
                <div>
                  <dt>
                    <kbd>Enter</kbd>
                  </dt>
                  <dd>Nộp câu · xong rồi thì sang câu kế</dd>
                </div>
                <div>
                  <dt>
                    <kbd>Tab</kbd> <kbd>⇧ Tab</kbd>
                  </dt>
                  <dd>Hé một chữ / hé cả từ</dd>
                </div>
                <div>
                  <dt>
                    <kbd>Ctrl</kbd> <kbd>Alt</kbd>
                  </dt>
                  <dd>Nhấn-thả: nghe lại / nghe chậm</dd>
                </div>
                <div>
                  <dt>
                    <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
                  </dt>
                  <dd>Xem đáp án (sau lần nộp đầu)</dd>
                </div>
              </dl>
            )}
            {!isTouch && !isRewrite && (
              <dl className={styles.keys}>
                <div>
                  <dt>
                    <kbd>Space</kbd>
                  </dt>
                  <dd>Phát / dừng</dd>
                </div>
                <div>
                  <dt>
                    <kbd>←</kbd> <kbd>→</kbd>
                  </dt>
                  <dd>Câu trước / câu sau</dd>
                </div>
                <div>
                  <dt>
                    <kbd>R</kbd>
                  </dt>
                  <dd>Nghe lại câu</dd>
                </div>
                <div>
                  <dt>
                    <kbd>S</kbd>
                  </dt>
                  <dd>Đổi Từng câu / Liền mạch</dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
