import { memo } from "react";
import { RotateCcw } from "lucide-react";

import type { Cue } from "../types/video.types";
import {
  isTurnDone,
  newTurn,
  type RewriteTarget,
  type RewriteTurn,
} from "../utils/rewrite-exercise";
import { formatTime, markSoundTokens } from "../utils/subtitle-reading";
import { splitToken } from "../utils/video-cloze";
import { ReaderWords, type ClozeState, type WordDisplayProps } from "./ReaderWords";
import styles from "./ReaderTranscript.module.css";

interface ReaderCurrentSentenceProps extends WordDisplayProps {
  index: number;
  total: number;
  cue: Cue | null;
  translation: string;
  karaokeIndex: number;
  showTranslation: boolean;
  hidden: readonly number[] | null;
  cloze: ClozeState | null | undefined;
  rewriteTarget: RewriteTarget | null;
  rewriteTurn: RewriteTurn | null | undefined;
  onSeek: (seconds: number) => void;
}

/**
 * "Câu đang nói" box under the video (desktop). A new sentence slides in (keyed by its index).
 * Cloze / rewrite: unfinished gaps show as bars so the box never gives the answer away.
 */
export const ReaderCurrentSentence = memo(function ReaderCurrentSentence({
  index,
  total,
  cue,
  translation,
  karaokeIndex,
  showTranslation,
  hidden,
  cloze,
  rewriteTarget,
  rewriteTurn,
  onSeek,
  ...wordProps
}: ReaderCurrentSentenceProps) {
  if (!cue) {
    return (
      <div className={`${styles.nowBox} ${styles.nowEmpty}`}>
        <span>Bấm phát — câu đang nói sẽ hiện ở đây.</span>
      </div>
    );
  }
  let content;
  let translationVisible = showTranslation;
  if (rewriteTarget && rewriteTarget.length) {
    const turn = rewriteTurn || newTurn(rewriteTarget.length);
    const done = isTurnDone(turn);
    translationVisible = showTranslation || done || turn.peek || turn.attempts >= 2;
    if (done) {
      content = (
        <ReaderWords cue={cue} active karaokeIndex={karaokeIndex} {...wordProps} cueIndex={index} />
      );
    } else {
      // Subtitle token ↔ word of the rewrite frame: skip sounds and walk in parallel; solved words show their text.
      const toks = cue[2].split(" ");
      const sfx = markSoundTokens(toks);
      let j = -1;
      content = toks.map((tok, i) => {
        if (sfx[i]) {
          return (
            <span key={i} className={styles.soundEffect}>
              {tok}
            </span>
          );
        }
        // A punctuation-only token ("-", "&") is not a slot of the rewrite frame: show it as is.
        if (!/[\p{L}\p{N}]/u.test(tok)) {
          return (
            <span key={i} className={styles.wordWrap}>
              <span className={styles.w}>{tok}</span>
            </span>
          );
        }
        j += 1;
        if (turn.locked[j]) {
          return (
            <span key={i} className={styles.wordWrap}>
              <span className={`${styles.w} ${styles.said}`}>{tok}</span>
            </span>
          );
        }
        const [before, hiddenWord, after] = splitToken(tok);
        return (
          <span key={i} className={styles.wordWrap}>
            <span className={styles.w}>
              {before}
              <span
                className={styles.mask}
                style={{ width: `${Math.max(1, hiddenWord.length)}ch` }}
              />
              {after}
            </span>
          </span>
        );
      });
    }
  } else {
    content = (
      <ReaderWords
        cue={cue}
        active
        karaokeIndex={karaokeIndex}
        hidden={hidden}
        cloze={cloze}
        masked
        {...wordProps}
        cueIndex={index}
      />
    );
  }
  return (
    <div className={styles.nowBox} aria-live="off">
      <div className={styles.nowHead}>
        <button
          type="button"
          className={styles.nowTime}
          onClick={() => onSeek(cue[0])}
          title="Nghe lại từ đầu câu"
        >
          <RotateCcw size={12} aria-hidden="true" />
          {formatTime(cue[0])}
        </button>
        <span className={styles.nowNo}>{`Câu ${index + 1} / ${total}`}</span>
      </div>
      <div key={index} className={styles.nowBody}>
        <div className={`${styles.orig} ${styles.nowEn}`}>{content}</div>
        {translationVisible && translation && <div className={styles.nowVi}>{translation}</div>}
      </div>
    </div>
  );
});
