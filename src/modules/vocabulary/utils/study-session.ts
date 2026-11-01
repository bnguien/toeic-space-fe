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

/** Reel: Good if typed correctly, Hard if typed wrong, Seen when time ran out without input. */
export const reelGrade = (typed: string | null, headword: string): ReviewGrade => {
  if (typed === null) return "Seen";
  return normalizeAnswer(typed) === normalizeAnswer(headword) ? "Good" : "Hard";
};

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
