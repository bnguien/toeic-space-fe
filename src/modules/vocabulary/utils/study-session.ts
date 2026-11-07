import {
  STUDY_MODES,
  type ReviewGrade,
  type ReviewMode,
  type SchedulePreviewDto,
  type SelfGrade,
  type StudyMode,
} from "../types/vocabulary.types";

export const isStudyMode = (value: string | undefined): value is StudyMode =>
  !!value && (STUDY_MODES as readonly string[]).includes(value);

/** Study mode of a server mode value. */
export const toStudyMode = (mode: ReviewMode): StudyMode =>
  mode === "Quiz" ? "quiz" : mode === "Reel" ? "reel" : "flashcard";

export const REVIEW_MODE: Record<StudyMode, ReviewMode> = {
  flashcard: "Flashcard",
  quiz: "Quiz",
  reel: "Reel",
};

export const MODE_LABELS: Record<StudyMode, string> = {
  flashcard: "Flashcard",
  quiz: "Trắc nghiệm",
  reel: "Reel",
};

/** Grades that send the card back into the session and onto the review list. */
export const needsReview = (grade: ReviewGrade): boolean =>
  grade === "Forget" || grade === "Hard" || grade === "Seen";

/** Quiz: Good if the first pick is correct, otherwise Forget. */
export const quizGrade = (correct: boolean): ReviewGrade => (correct ? "Good" : "Forget");

/** Reel: Good if typed correctly, Forget if typed wrong, Seen when time ran out without input. */
export const reelGrade = (typed: string | null, headword: string): ReviewGrade => {
  if (typed === null) return "Seen";
  return normalizeAnswer(typed) === normalizeAnswer(headword) ? "Good" : "Forget";
};

export const isLetter = (char: string): boolean => /[\p{L}\p{N}]/u.test(char);

/** Hinted letters: the first of each token, plus its last one when `last` is set. */
export function hintIndexes(word: string, { first, last }: { first: boolean; last: boolean }) {
  const chars = Array.from(word);
  const hints = new Set<number>();
  chars.forEach((char, index) => {
    if (!isLetter(char)) return;
    const startsToken = index === 0 || !isLetter(chars[index - 1]);
    const endsToken = index === chars.length - 1 || !isLetter(chars[index + 1]);
    if (first && startsToken) hints.add(index);
    if (last && endsToken && !startsToken) hints.add(index);
  });
  return hints;
}

export const normalizeAnswer = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[’`]/g, "'");

export const previewFor = (preview: SchedulePreviewDto, grade: SelfGrade): number => {
  switch (grade) {
    case "Forget":
      return preview.forget;
    case "Hard":
      return preview.hard;
    case "Good":
      return preview.good;
    case "Easy":
      return preview.easy;
  }
};
