import type { AnswerOptions, StudyCardApi } from "../components/StudySession";
import type { ReviewGrade, StudyItemDto, WordDto } from "../types/vocabulary.types";

/** A word studied outside a server session has no schedule: every preview is "today". */
const NO_PREVIEW = { forget: 0, hard: 0, good: 0, easy: 0 } as const;
const NEW_PROGRESS: StudyItemDto["progress"] = {
  status: "New",
  intervalDays: 0,
  repetitions: 0,
  dueOn: null,
  isDue: false,
  lastReviewedAt: null,
};

interface LocalStudyCardOptions {
  word: WordDto;
  /** Unique per attempt (the study cards reset their state on a new key). */
  cardKey: string;
  position: number;
  /** The card was answered; with `options.manual` it stays until `onAdvance`. */
  onAnswer: (grade: ReviewGrade, options?: AnswerOptions) => void;
  /** The learner moved on from an answered card. */
  onAdvance: () => void;
  paused?: boolean;
}

/**
 * Card API for the PBL-75 study cards (`ReelCard`, `QuizCard`, `FlashcardCard`) when the words are not part of a
 * server study session — e.g. the words of a dictation sentence or of a grammar topic. Nothing is scheduled or
 * saved; the caller keeps its own results through `onAnswer`.
 */
export function createLocalStudyCard({
  word,
  cardKey,
  position,
  onAnswer,
  onAdvance,
  paused = false,
}: LocalStudyCardOptions): StudyCardApi {
  return {
    item: { word, progress: NEW_PROGRESS, preview: NO_PREVIEW, savedWordId: null },
    cardKey,
    position,
    preview: NO_PREVIEW,
    saving: false,
    failed: false,
    paused,
    userPaused: false,
    togglePause: () => {},
    answer: onAnswer,
    advance: onAdvance,
  };
}
