import { useLayoutEffect, useMemo, useRef } from "react";

import type { NewsSentenceDto, NewsVocabularyItemDto, TranslationMode } from "../types/news.types";
import {
  attachVocabulary,
  normalizeToken,
  shortMeaning,
  splitWords,
  type MatchedToken,
  type VocabularyIndex,
} from "../utils/news-reader";
import styles from "./ReaderSentence.module.css";

export interface ReaderView {
  /** Underline the prepared vocabulary. */
  suggested: boolean;
  /** Bold looked-up words. */
  lookedUp: boolean;
  /** Short meaning above looked-up words. */
  meaning: boolean;
  karaoke: boolean;
  autoScroll: boolean;
  speakOnClick: boolean;
}

export interface LookedUpPhrase {
  from: number;
  to: number;
  text: string;
  meaning: string;
  pending: boolean;
}

interface ReaderSentenceProps {
  sentence: NewsSentenceDto;
  vocabulary: NewsVocabularyItemDto[];
  vocabularyIndex: VocabularyIndex;
  knownWords: Set<string>;
  mode: TranslationMode;
  active: boolean;
  reading: boolean;
  view: ReaderView;
  lookedUpMeanings: Map<string, string>;
  phrases?: LookedUpPhrase[];
  onWord: (token: MatchedToken, sentence: NewsSentenceDto, element: HTMLElement) => void;
}

/** One sentence: every word is clickable; prepared vocabulary is underlined; the translation follows the mode. */
export function ReaderSentence({
  sentence,
  vocabulary,
  vocabularyIndex,
  knownWords,
  mode,
  active,
  reading,
  view,
  lookedUpMeanings,
  phrases = [],
  onWord,
}: ReaderSentenceProps) {
  const tokens = useMemo(
    () => attachVocabulary(splitWords(sentence.text), vocabulary, vocabularyIndex),
    [sentence.text, vocabulary, vocabularyIndex],
  );
  // Word index of each token (matches the karaoke index of useReadAloud); -1 for non-words.
  const wordOrdinals = useMemo(() => {
    let count = 0;
    return tokens.map((x) => (x.isWord ? count++ : -1));
  }, [tokens]);
  const showTranslation = mode === "bilingual";
  const phraseAt = (j: number) => phrases.find((p) => j >= p.from && j <= p.to);
  const previousWordIndex = (i: number) => {
    for (let j = i - 1; j >= 0; j -= 1) if (tokens[j].isWord) return wordOrdinals[j];
    return -1;
  };

  // The meaning of a phrase is centred over the whole phrase: measure first → last word and put --phrase-width on the
  // first word (a phrase that wraps loses it → the meaning sits left over the first word).
  const sentenceRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const root = sentenceRef.current;
    if (!root || !phrases.length) return undefined;
    const measure = () =>
      phrases.forEach((p) => {
        const start = root.querySelector<HTMLElement>(`[data-word="${p.from}"]`);
        const end = root.querySelector<HTMLElement>(`[data-word="${p.to}"]`);
        if (!start || !end) return;
        const a = start.getBoundingClientRect();
        const b = end.getBoundingClientRect();
        if (Math.abs(a.top - b.top) < 4)
          start.style.setProperty("--phrase-width", `${b.right - a.left}px`);
        else start.style.removeProperty("--phrase-width");
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [phrases, view.meaning]);

  const sentenceClass = [
    styles.sentence,
    active ? styles.sentenceActive : "",
    reading ? styles.sentenceReading : "",
  ].join(" ");

  return (
    <span ref={sentenceRef} className={sentenceClass} data-sentence={sentence.id}>
      <span className={styles.english}>
        {tokens.map((x, i) => {
          if (!x.isWord) {
            const previous = previousWordIndex(i);
            const inPhrase =
              view.lookedUp && phraseAt(previous) && phraseAt(previous) === phraseAt(previous + 1);
            const gapClass = inPhrase
              ? styles.phrase
              : view.suggested && x.entry && !knownWords.has(x.entry.word)
                ? `${styles.suggested} ${styles.suggestedGap}`
                : undefined;
            return (
              <span key={i} className={gapClass}>
                {x.text}
              </span>
            );
          }
          const suggested = view.suggested && x.entry && !knownWords.has(x.entry.word);
          const lookedUpMeaning =
            lookedUpMeanings.get(normalizeToken(x.text)) ??
            (x.entry ? lookedUpMeanings.get(normalizeToken(x.entry.word)) : undefined);
          const isLookedUp = lookedUpMeaning !== undefined;
          const phrase = phraseAt(wordOrdinals[i]);
          const isPhraseStart = !!phrase && wordOrdinals[i] === phrase.from;
          // In a phrase, the meaning of the whole phrase sits over its first word only.
          const meaningAbove = phrase
            ? isPhraseStart
              ? phrase.meaning
                ? shortMeaning(phrase.meaning, 34)
                : phrase.pending
                  ? "…"
                  : ""
              : ""
            : isLookedUp
              ? shortMeaning(lookedUpMeaning)
              : "";
          const wordClass = [
            styles.word,
            suggested ? styles.suggested : "",
            (isLookedUp || phrase) && view.lookedUp ? styles.lookedUp : "",
            phrase && view.lookedUp ? styles.phrase : "",
            isPhraseStart ? styles.phraseStart : "",
          ].join(" ");
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className={wordClass}
              data-word={wordOrdinals[i]}
              data-entry={x.entry ? x.entry.word : undefined}
              data-meaning={view.meaning && meaningAbove ? meaningAbove : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onWord(x, sentence, e.currentTarget);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onWord(x, sentence, e.currentTarget);
                }
              }}
            >
              {x.text}
            </span>
          );
        })}
      </span>
      {showTranslation && <span className={styles.translation}>{sentence.translation}</span>}{" "}
    </span>
  );
}
