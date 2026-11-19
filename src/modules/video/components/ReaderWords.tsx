import type { CSSProperties, ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import type { Cue, GlossEntryDto } from "../types/video.types";
import { cleanToken, markSoundTokens, tokenDuration, wordTier } from "../utils/subtitle-reading";
import { splitToken } from "../utils/video-cloze";
import { shortPos } from "../utils/video-lesson";
import styles from "./ReaderTranscript.module.css";

const GLOSS_MAX = 28;
/** Non-breaking space keeps the IPA / meaning line of a word without data. */
const PLACEHOLDER = String.fromCharCode(0xa0);

export type ClozeResult = "ok" | "wrong" | "shown";

/** Cloze state of one sentence: typed values and results per token index. */
export interface ClozeState {
  values: Record<number, string>;
  results: Record<number, ClozeResult | "" | undefined>;
}

export interface PhraseLookup {
  from: number;
  to: number;
  text: string;
  meaning: string;
  loading: boolean;
}

/** Clicked tokens of a sentence (bold + meaning above) and the merged phrases. */
export interface CueLookup {
  sel: number[];
  phrases: PhraseLookup[];
}

export type CueLookups = Record<number, CueLookup>;

/** Word props shared by rows, paragraphs and the current-sentence box (stable values keep memo working). */
export interface WordDisplayProps {
  showGloss: boolean;
  showPhonetic: boolean;
  markSaved: boolean;
  gloss: Record<string, GlossEntryDto>;
  savedSet: ReadonlySet<string>;
  levels: Record<string, string>;
  highlightTiers: string;
  onWord: (word: string, cue: Cue | null, tokenIndex?: number) => void;
  lookups: CueLookups;
}

interface ReaderWordsProps extends WordDisplayProps {
  cue: Cue;
  active: boolean;
  /** Index of the word being spoken (-1 = none). */
  karaokeIndex: number;
  /** Flow mode: inline text, no IPA / meaning lines. */
  inParagraph?: boolean;
  /** Cloze: hidden token indices of this sentence. */
  hidden?: readonly number[] | null;
  cloze?: ClozeState | null;
  cueIndex?: number;
  onType?: (cueIndex: number, tokenIndex: number, value: string) => void;
  onCheck?: (cueIndex: number) => void;
  /** Cloze: replay button at the end of the sentence. */
  onListen?: ((cueIndex: number) => void) | null;
  /** Current-sentence box: blanks become bars (never inputs). */
  masked?: boolean;
}

/** "đợt thử nghiệm, phép thử" → "đợt thử nghiệm" (trimmed) to sit above a word / phrase. */
const shortMeaning = (text: string, max = 22): string => {
  const s = String(text || "")
    .split(/[,;(]/)[0]
    .trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const TIER_CLASS: Record<string, string> = {
  toeic: styles.levelToeic,
  b2: styles.levelB2,
  c1: styles.levelC1,
};

const isDone = (result: string | undefined) => result === "ok" || result === "shown";

interface CellOptions {
  hasIpa: boolean;
  hasGlossRow: boolean;
}

/** Gap of the current-sentence box: a bar; right / revealed shows the word. */
function maskedCell(
  tok: string,
  i: number,
  cloze: ClozeState | null | undefined,
  opts: CellOptions,
) {
  const [before, word, after] = splitToken(tok);
  const result = cloze?.results[i] || "";
  const done = isDone(result);
  return (
    <span key={i} className={styles.wordWrap}>
      {opts.hasIpa && <span className={styles.ipa}>{PLACEHOLDER}</span>}
      <span className={`${styles.w} ${done ? `${styles.blankDone} ${styles[result]}` : ""}`}>
        {before}
        {done ? (
          word
        ) : (
          <span
            className={styles.mask}
            style={{ width: `${word.length}ch` }}
            aria-label={`${word.length} chữ cái`}
          />
        )}
        {after}
      </span>
      {opts.hasGlossRow && <span className={styles.gloss}>{PLACEHOLDER}</span>}
    </span>
  );
}

/** One cloze blank. Punctuation stays outside; right / revealed shows the word again. */
function blankCell(
  tok: string,
  i: number,
  cloze: ClozeState | null | undefined,
  cueIndex: number,
  onType: ReaderWordsProps["onType"],
  onCheck: ReaderWordsProps["onCheck"],
  opts: CellOptions,
) {
  const [before, word, after] = splitToken(tok);
  const result = cloze?.results[i] || "";
  if (isDone(result)) {
    return (
      <span key={i} className={styles.wordWrap}>
        {opts.hasIpa && <span className={styles.ipa}>{PLACEHOLDER}</span>}
        <span className={`${styles.w} ${styles.blankDone} ${styles[result]}`}>{tok}</span>
        {opts.hasGlossRow && <span className={styles.gloss}>{PLACEHOLDER}</span>}
      </span>
    );
  }
  return (
    <span key={i} className={styles.wordWrap}>
      {opts.hasIpa && <span className={styles.ipa}>{PLACEHOLDER}</span>}
      <span className={`${styles.w} ${styles.blankWrap}`}>
        {before}
        <input
          className={`${styles.blank} ${result === "wrong" ? styles.wrong : ""}`}
          data-blank={`${cueIndex}-${i}`}
          style={{ width: `${word.length + 1}ch` }}
          value={cloze?.values[i] || ""}
          placeholder={"·".repeat(word.length)}
          maxLength={word.length + 4}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          aria-label={`Từ còn thiếu, ${word.length} chữ cái`}
          aria-invalid={result === "wrong" || undefined}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onType?.(cueIndex, i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCheck?.(cueIndex);
            }
            if (e.key === "Escape") e.currentTarget.blur();
          }}
        />
        {after}
      </span>
      {opts.hasGlossRow && <span className={styles.gloss}>{PLACEHOLDER}</span>}
    </span>
  );
}

/**
 * Words of one sentence (karaoke + IPA + meaning + tiers). Rows and paragraphs share it.
 * `lookups[cueIndex]` = clicked tokens (bold + meaning above) and phrases of adjacent clicked tokens (meaning centred
 * over the phrase, measured by the reader).
 */
export function ReaderWords({
  cue,
  active,
  karaokeIndex,
  showGloss,
  showPhonetic,
  markSaved,
  gloss,
  savedSet,
  levels,
  highlightTiers,
  onWord,
  lookups,
  inParagraph = false,
  hidden = null,
  cloze = null,
  cueIndex = -1,
  onType,
  onCheck,
  onListen = null,
  masked = false,
}: ReaderWordsProps) {
  const tokens = cue[2].split(" ");
  const isSound = markSoundTokens(tokens);
  const keys = tokens.map((tok) => cleanToken(tok).toLowerCase());
  // Rows: once a sentence has IPA / meanings, words without them keep an empty line so every word stays aligned.
  // Meanings only for tiered words (TOEIC/B2/C1+): a meaning under every word ("a → một") is noise.
  // Paragraphs: no inline annotations — meanings via hover / click.
  const hasTier = (k: string) => !!(levels && k && wordTier(levels[k]));
  const hasIpa =
    !inParagraph && showPhonetic && !!gloss && keys.some((k) => k && gloss[k] && gloss[k].ipa);
  const hasGlossRow =
    !inParagraph &&
    showGloss &&
    !!gloss &&
    keys.some((k) => hasTier(k) && gloss[k] && gloss[k].meaning);
  const sentenceLookup = lookups && cueIndex >= 0 ? lookups[cueIndex] : null;
  const karaokeDuration = active && karaokeIndex >= 0 ? tokenDuration(cue, karaokeIndex) : 0;
  const opts: CellOptions = { hasIpa, hasGlossRow };

  const wordNodes: ReactNode[] = tokens.map((tok, i) => {
    if (isSound[i]) {
      return (
        <span key={i} className={styles.soundEffect}>
          {inParagraph ? `${tok} ` : tok}
        </span>
      );
    }
    if (hidden && hidden.includes(i)) {
      return masked
        ? maskedCell(tok, i, cloze, opts)
        : blankCell(tok, i, cloze, cueIndex, onType, onCheck, opts);
    }
    const cleanWord = cleanToken(tok);
    const key = keys[i];
    const g = key && gloss ? gloss[key] : null;
    const tier = highlightTiers && levels ? wordTier(levels[key]) : "";
    const highlighted = !!tier && highlightTiers.includes(tier);
    const isCurrent = active && i === karaokeIndex;
    // Clicked word / phrase: meaning ABOVE (like the news reader) instead of the meaning line below.
    const phrase = sentenceLookup
      ? sentenceLookup.phrases.find((c) => i >= c.from && i <= c.to)
      : null;
    const clicked = !!sentenceLookup && sentenceLookup.sel.includes(i);
    let aboveText = "";
    if (phrase)
      aboveText =
        i === phrase.from ? (phrase.meaning ? shortMeaning(phrase.meaning, 34) : "…") : "";
    else if (clicked) aboveText = g && g.meaning ? shortMeaning(g.meaning) : "…";
    // First meaning only: there is room for 1–3 words under a word; the card has the rest.
    const meaning =
      !aboveText &&
      !clicked &&
      !phrase &&
      !inParagraph &&
      showGloss &&
      g &&
      g.meaning &&
      hasTier(key)
        ? g.meaning.split(/[,;]/)[0].trim()
        : "";
    const cls = [
      styles.w,
      active && karaokeIndex >= 0 && i < karaokeIndex ? styles.said : "",
      isCurrent ? styles.speaking : "",
      markSaved && savedSet.has(key) ? styles.kept : "",
      highlighted ? TIER_CLASS[tier] : "",
      clicked || phrase ? styles.looked : "",
      phrase ? styles.phrase : "",
    ]
      .filter(Boolean)
      .join(" ");
    const kdStyle =
      isCurrent && karaokeDuration
        ? ({ "--kd": `${karaokeDuration.toFixed(2)}s` } as CSSProperties)
        : undefined;
    return (
      <span
        key={i}
        className={styles.wordWrap}
        data-meaning={aboveText || undefined}
        data-phrase={phrase && i === phrase.from ? `${cueIndex}-${phrase.from}` : undefined}
        data-phrase-end={phrase && i === phrase.to ? `${cueIndex}-${phrase.from}` : undefined}
      >
        {hasIpa && (
          <span className={styles.ipa}>
            {(g && g.ipa) || PLACEHOLDER}
            {g?.partOfSpeech && (
              <span className={styles.partOfSpeech}>{shortPos(g.partOfSpeech)}</span>
            )}
          </span>
        )}
        <span
          className={cls}
          data-word={key || undefined}
          style={kdStyle}
          onClick={
            cleanWord
              ? (e) => {
                  e.stopPropagation();
                  onWord(cleanWord, cue, i);
                }
              : undefined
          }
        >
          {tok}
        </span>
        {(meaning || hasGlossRow) && (
          // Absolutely positioned inside the cell: a long meaning never widens the word column.
          <span className={styles.gloss}>
            {meaning ? (
              <span>
                {meaning.length > GLOSS_MAX ? `${meaning.slice(0, GLOSS_MAX)}…` : meaning}
              </span>
            ) : (
              PLACEHOLDER
            )}
          </span>
        )}
        {inParagraph && " "}
      </span>
    );
  });

  if (!onListen) return <>{wordNodes}</>;
  // Cloze: the replay button stands like a last "word" (same IPA/meaning column) glued to the last word so it never
  // drops to a line of its own.
  const lastWord = wordNodes.pop();
  wordNodes.push(
    <span key="replay" className={styles.tail}>
      {lastWord}
      <span className={styles.wordWrap}>
        {hasIpa && <span className={styles.ipa}>{PLACEHOLDER}</span>}
        <button
          type="button"
          className={styles.replay}
          onClick={(e) => {
            e.stopPropagation();
            onListen(cueIndex);
          }}
          aria-label={`Nghe lại câu ${cueIndex + 1}`}
          title="Nghe lại câu này (R)"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
        {hasGlossRow && <span className={styles.gloss}>{PLACEHOLDER}</span>}
      </span>
    </span>,
  );
  return <>{wordNodes}</>;
}
