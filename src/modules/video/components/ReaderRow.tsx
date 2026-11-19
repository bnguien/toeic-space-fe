import { memo } from "react";

import type { Cue } from "../types/video.types";
import {
  newTurn,
  isTurnDone,
  type RewriteTarget,
  type RewriteTurn,
} from "../utils/rewrite-exercise";
import { formatTime } from "../utils/subtitle-reading";
import { ReaderWords, type ClozeState, type WordDisplayProps } from "./ReaderWords";
import { RewriteResult, VideoRewrite } from "./VideoRewrite";
import styles from "./ReaderTranscript.module.css";

export interface ReaderRowProps extends WordDisplayProps {
  index: number;
  cue: Cue;
  translation: string;
  active: boolean;
  past: boolean;
  karaokeIndex: number;
  showTranslation: boolean;
  onSeek: (seconds: number) => void;
  registerRef: (index: number, el: HTMLElement | null) => void;
  /** Cloze: hidden token indices (null outside the cloze mode). */
  hidden: readonly number[] | null;
  cloze: ClozeState | undefined;
  onType: (cueIndex: number, tokenIndex: number, value: string) => void;
  onCheck: (cueIndex: number) => void;
  onReveal: (cueIndex: number) => void;
  onListen: (cueIndex: number) => void;
  /** Rewrite: letter-slot frame (null outside the rewrite mode). */
  rewriteTarget: RewriteTarget | null;
  rewriteTurn: RewriteTurn | null | undefined;
  onRewriteTurn: (cueIndex: number, turn: RewriteTurn) => void;
  onRewriteListen: (cueIndex: number, slow: boolean) => void;
  onRewriteNext: (cueIndex: number) => void;
  onRewriteRetry: (cueIndex: number) => void;
}

/** One sentence of "Từng câu" / "Điền từ" / "Viết lại". Click = seek there. */
export const ReaderRow = memo(function ReaderRow({
  index,
  cue,
  translation,
  active,
  past,
  karaokeIndex,
  showTranslation,
  onSeek,
  registerRef,
  hidden,
  cloze,
  onType,
  onCheck,
  onReveal,
  onListen,
  rewriteTarget,
  rewriteTurn,
  onRewriteTurn,
  onRewriteListen,
  onRewriteNext,
  onRewriteRetry,
  ...wordProps
}: ReaderRowProps) {
  if (rewriteTarget && rewriteTarget.length) {
    const turn = rewriteTurn || newTurn(rewriteTarget.length);
    const turnDone = isTurnDone(turn);
    const statusClass =
      turn.status === "clean" ? styles.vlClean : turn.status === "passed" ? styles.vlPassed : "";
    const rewriteRowClass = [
      styles.row,
      active ? styles.active : "",
      past ? styles.past : "",
      turnDone ? statusClass : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div
        ref={(el) => registerRef(index, el)}
        className={rewriteRowClass}
        onClick={() => onSeek(cue[0])}
        role="button"
        tabIndex={-1}
        aria-current={active ? "true" : undefined}
      >
        <span className={styles.time}>{formatTime(cue[0])}</span>
        <div className={styles.text}>
          <VideoRewrite
            index={index}
            target={rewriteTarget}
            turn={turn}
            translation={translation}
            showMeaning={showTranslation}
            active={active}
            onTurn={onRewriteTurn}
            onListen={onRewriteListen}
            onNext={onRewriteNext}
          />
          {turnDone && translation && <div className={styles.trans}>{translation}</div>}
          {turnDone && <RewriteResult turn={turn} onRetry={() => onRewriteRetry(index)} />}
        </div>
      </div>
    );
  }

  const hasBlanks = !!(hidden && hidden.length);
  const results = cloze?.results ?? {};
  const isDone = hasBlanks && hidden.every((j) => results[j] === "ok" || results[j] === "shown");
  const hasWrong = hasBlanks && hidden.some((j) => results[j] === "wrong");
  const rowClass = [
    styles.row,
    active ? styles.active : "",
    past ? styles.past : "",
    isDone ? styles.clozeDone : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      ref={(el) => registerRef(index, el)}
      className={rowClass}
      onClick={() => onSeek(cue[0])}
      role="button"
      tabIndex={-1}
      aria-current={active ? "true" : undefined}
    >
      <span className={styles.time}>{formatTime(cue[0])}</span>
      <div className={styles.text}>
        <div className={styles.orig}>
          <ReaderWords
            cue={cue}
            active={active}
            karaokeIndex={karaokeIndex}
            {...wordProps}
            hidden={hasBlanks ? hidden : null}
            cloze={cloze}
            cueIndex={index}
            onType={onType}
            onCheck={onCheck}
            onListen={hasBlanks ? onListen : null}
          />
        </div>
        {showTranslation && translation && <div className={styles.trans}>{translation}</div>}
        {hasBlanks && !isDone && (active || hasWrong) && (
          <div className={styles.clozeActions}>
            <button
              type="button"
              className={styles.clozeCheck}
              onClick={(e) => {
                e.stopPropagation();
                onCheck(index);
              }}
            >
              Kiểm tra <kbd>Enter</kbd>
            </button>
            <button
              type="button"
              className={styles.clozeShow}
              onClick={(e) => {
                e.stopPropagation();
                onReveal(index);
              }}
            >
              Xem đáp án
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
