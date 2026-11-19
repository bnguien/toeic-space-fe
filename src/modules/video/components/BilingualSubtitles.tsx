// Bilingual subtitle overlay over the YouTube player — display only.
// The YouTube iframe is cross-origin and never exposes its captions, so the reader draws its own. This component does
// not create the player nor call any API: `time` comes from the reader (one YT.Player per iframe).
import type { Cue } from "../types/video.types";
import { cleanToken, findCueIndex } from "../utils/subtitle-reading";
import styles from "./BilingualSubtitles.module.css";

const GLOSS_MAX = 26;

interface WordAnnotation {
  meaning?: string;
  phonetic?: string;
}

interface BilingualSubtitlesProps {
  time?: number;
  primary?: readonly Cue[];
  secondary?: readonly Cue[];
  showSecondary?: boolean;
  /** {lowercase word: {vi, phonetic}} */
  annots?: Record<string, WordAnnotation> | null;
  showPhonetic?: boolean;
  showGloss?: boolean;
  /** Saved words (lowercase). */
  savedWords?: ReadonlySet<string> | null;
  markSaved?: boolean;
  onWordClick?: ((word: string) => void) | null;
  fontScale?: number;
  syncUnavailable?: boolean;
}

export function BilingualSubtitles({
  time = 0,
  primary = [],
  secondary = [],
  showSecondary = true,
  annots = null,
  showPhonetic = false,
  showGloss = false,
  savedWords = null,
  markSaved = false,
  onWordClick = null,
  fontScale = 1,
  syncUnavailable = false,
}: BilingualSubtitlesProps) {
  if (syncUnavailable) {
    return (
      <div className={styles.overlay}>
        <div className={`${styles.line} ${styles.errorLine}`}>
          Không kết nối được player để đồng bộ phụ đề.
        </div>
      </div>
    );
  }

  const primaryIndex = findCueIndex(primary, time);
  const primaryCue = primaryIndex >= 0 ? primary[primaryIndex] : null;
  const secondaryIndex = findCueIndex(secondary, time);
  const secondaryCue = secondaryIndex >= 0 ? secondary[secondaryIndex] : null;

  if (!primaryCue && !(showSecondary && secondaryCue)) return null;

  const renderWord = (tok: string, i: number) => {
    const cleanWord = cleanToken(tok);
    if (!cleanWord) return <span key={i} className={styles.plain}>{`${tok} `}</span>;
    const a = annots ? annots[cleanWord.toLowerCase()] : null;
    const isSaved = markSaved && savedWords && savedWords.has(cleanWord.toLowerCase());
    const gloss =
      showGloss && a && a.meaning
        ? a.meaning.length > GLOSS_MAX
          ? `${a.meaning.slice(0, GLOSS_MAX)}…`
          : a.meaning
        : "";
    return (
      <span
        key={i}
        className={`${styles.word} ${isSaved ? styles.saved : ""}`}
        role="button"
        tabIndex={-1}
        onClick={onWordClick ? () => onWordClick(cleanWord) : undefined}
      >
        {showPhonetic && a && a.phonetic && <span className={styles.ipa}>{a.phonetic}</span>}
        <span className={styles.token}>{tok}</span>
        {gloss && <span className={styles.gloss}>{gloss}</span>}
      </span>
    );
  };

  const interactive = Boolean(onWordClick) || showGloss || showPhonetic || markSaved;

  return (
    <div className={styles.overlay} style={{ fontSize: `${fontScale}em` }}>
      {primaryCue && (
        <div className={`${styles.line} ${styles.primary}`}>
          {interactive ? primaryCue[2].split(" ").map(renderWord) : primaryCue[2]}
        </div>
      )}
      {showSecondary && secondaryCue && (
        <div className={`${styles.line} ${styles.secondary}`}>{secondaryCue[2]}</div>
      )}
    </div>
  );
}
