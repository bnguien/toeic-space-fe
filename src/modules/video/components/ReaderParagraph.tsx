import { memo } from "react";

import type { Cue } from "../types/video.types";
import { ReaderWords, type WordDisplayProps } from "./ReaderWords";
import styles from "./ReaderTranscript.module.css";

export interface ReaderParagraphProps extends WordDisplayProps {
  ids: readonly number[];
  cues: readonly Cue[];
  translations: readonly string[];
  /** Index of the sentence playing when it belongs to this paragraph, else -1. */
  activeIndex: number;
  past: boolean;
  karaokeIndex: number;
  showTranslation: boolean;
  onSeek: (seconds: number) => void;
  registerRef: (index: number, el: HTMLElement | null) => void;
}

/** One paragraph of "Liền mạch": every sentence is an inline segment; clicking one seeks there. */
export const ReaderParagraph = memo(function ReaderParagraph({
  ids,
  cues,
  translations,
  activeIndex,
  past,
  karaokeIndex,
  showTranslation,
  onSeek,
  registerRef,
  ...wordProps
}: ReaderParagraphProps) {
  const hasActive = activeIndex >= 0;
  return (
    <div
      className={[styles.para, hasActive ? styles.active : "", past ? styles.past : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <p className={styles.paraEn}>
        {ids.map((i) => {
          const active = i === activeIndex;
          const isPast = past || (hasActive && i < activeIndex);
          return (
            <span
              key={i}
              ref={(el) => registerRef(i, el)}
              className={[styles.segment, active ? styles.active : "", isPast ? styles.past : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSeek(cues[i][0])}
              aria-current={active ? "true" : undefined}
            >
              <ReaderWords
                cue={cues[i]}
                active={active}
                karaokeIndex={active ? karaokeIndex : -1}
                inParagraph
                {...wordProps}
                cueIndex={i}
              />
            </span>
          );
        })}
      </p>
      {showTranslation && (
        <p className={styles.paraVi}>
          {ids.map((i) =>
            translations[i] ? (
              <span key={i} className={i === activeIndex ? styles.on : undefined}>
                {`${translations[i]} `}
              </span>
            ) : null,
          )}
        </p>
      )}
    </div>
  );
});
