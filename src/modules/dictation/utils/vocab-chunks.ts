/**
 * Basic mode of a course: words are learned IN BETWEEN sentences, each round only the new words of the
 * next 2–3 sentences (a sentence with many new words stands alone), never the whole course at once.
 *
 * planVocabChunks(words, total) → [{ start, end, words }]
 *   words: entries of /courses/{id}/vocab — each has `sentence` (1-based, sentence order of the course)
 *   start/end: 0-based sentence indexes (end inclusive) in the stage's sentence list
 * Rounds without new words are returned too (empty `words`) so callers know the boundaries; only rounds
 * with words are shown.
 */
import type { CourseVocabWordDto } from "../types/dictation.types";

export const MAX_SENTENCES = 3;
/** Enough to write 2–3 sentences without overloading working memory. */
export const MAX_WORDS = 8;
/** A sentence bringing ≥ 5 new words is a round of its own. */
export const LONG_SENTENCE_WORDS = 5;

export interface VocabChunk {
  start: number;
  end: number;
  words: CourseVocabWordDto[];
}

export function planVocabChunks(
  words: CourseVocabWordDto[] | null | undefined,
  total: number,
): VocabChunk[] {
  const bySentence: CourseVocabWordDto[][] = Array.from({ length: Math.max(0, total) }, () => []);
  (words || []).forEach((word) => {
    const i = Number(word?.sentence) - 1;
    if (i >= 0 && i < bySentence.length) bySentence[i].push(word);
  });
  const chunks: VocabChunk[] = [];
  let i = 0;
  while (i < bySentence.length) {
    const start = i;
    const list = [...bySentence[i]];
    i += 1;
    if (list.length < LONG_SENTENCE_WORDS) {
      while (
        i < bySentence.length &&
        i - start < MAX_SENTENCES &&
        bySentence[i].length < LONG_SENTENCE_WORDS &&
        list.length + bySentence[i].length <= MAX_WORDS
      ) {
        list.push(...bySentence[i]);
        i += 1;
      }
    }
    chunks.push({ start, end: i - 1, words: list });
  }
  return chunks;
}

/** Card shape of the interlude flashcards (a lemma replaces an inflected form). */
export interface InterludeWord {
  word: string;
  meaning: string;
  ipa: string;
  partOfSpeech: string;
}

export function toInterludeWords(words: CourseVocabWordDto[] | null | undefined): InterludeWord[] {
  return (words || []).map((w) => ({
    word: w.lemma && w.word.toLowerCase() !== w.lemma ? w.lemma : w.word,
    meaning: w.meaning,
    ipa: w.ipa || "",
    partOfSpeech: w.partOfSpeech || "",
  }));
}
