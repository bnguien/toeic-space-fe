/** DTOs of the Content service grammar API (`/content/api/v1/grammar/...`, see toeic-space-be/docs/grammar.md). */
import type { GrammarKnowledge } from "./knowledge.types";
import type { GrammarQuestion, GrammarTests } from "./exercise.types";
import type { GrammarVocab } from "./vocab.types";

/** Parts of a topic (URL `?part=`). */
export type LessonPart = "theory" | "vocab" | "exercises";
export type ConfirmablePart = "theory" | "vocab";

export interface ScorePair {
  correct: number;
  total: number;
}

/** `correct = null` = never submitted (different from 0 points). */
export interface UnitScore {
  correct: number | null;
  total: number;
}

export interface LessonProgressDto {
  theoryDone: boolean;
  vocabDone: boolean;
  quickCheck: ScorePair | null;
  quickCheckUnits: Record<string, UnitScore>;
  miniTest: ScorePair | null;
  miniTestPassed: boolean;
  passMark: number | null;
  completed: boolean;
}

export interface StageRequirementDto {
  completed: number;
  required: number;
  total: number;
}

export interface StageProgressDto {
  unlocked: boolean;
  best: number | null;
  passed: boolean;
  total: number;
  passMark: number | null;
  requirement: StageRequirementDto;
}

export interface StudyPositionDto {
  topic: string;
  part: LessonPart;
  anchor: string;
}

export interface ProgressStatsDto {
  completedTopics: number;
  reviewCount: number;
  progressPercent: number;
}

export interface ProgressDto {
  stats: ProgressStatsDto;
  current: StudyPositionDto | null;
  lessons: Record<string, LessonProgressDto>;
  stages: Record<string, StageProgressDto>;
}

/** GET topics/{topic}: knowledge, vocabulary and exercises without answers. */
export interface LessonPayloadDto {
  topic: string;
  stage: string;
  title: string;
  version: string;
  knowledge: GrammarKnowledge;
  vocab: GrammarVocab;
  exercises: GrammarTests;
}

/** GET stages/{stage}/test: the stage test without answers + the viewer's status (guests: locked). */
export interface StageTestDto {
  stage: string;
  kind: string;
  title: string;
  questionCount: number;
  timeMinutes: number;
  passMark: number;
  version: string;
  topics: string[];
  questions: GrammarQuestion[];
  status: StageProgressDto;
}

export interface QuestionExplanationDto {
  signal: string;
  rule: string;
}

export interface QuestionResultDto {
  correct: boolean;
  explanation?: QuestionExplanationDto | null;
}

/** Block key: `qc-<u>` (quick check of unit u), `mt` (mini test) or `stage`. */
export type BlockKey = string;

export interface AttemptResultDto {
  /** Opaque: a number for signed-in learners, a signed `g.…` ticket (6 h) for guests. */
  attemptId: string;
  results: Record<string, QuestionResultDto>;
  score: number;
  total: number;
  passMark: number | null;
  best: number | null;
  /** `false` for guests: graded but nothing stored. */
  saved: boolean;
  lesson?: LessonProgressDto | null;
  stage?: StageProgressDto | null;
}

export interface AnswerResultDto extends QuestionResultDto {
  saved: boolean;
}

export interface RevealDto {
  questionId: string;
  answer: unknown;
  explanation: Record<string, unknown>;
  correction?: string;
  acceptedAnswers?: string[];
  correctReason?: string;
  grammaticalOptions?: string[];
  toeicTraps?: string[];
}

export interface CompleteResultDto {
  lesson: LessonProgressDto;
}

export interface PositionResultDto {
  current: StudyPositionDto;
}

export interface KnownWordResultDto {
  topic: string;
  word: string;
  known: boolean;
}

export interface GrammarPreferencesDto {
  darkMode: boolean | null;
  roadmapWidth: number | null;
  roadmapCollapsed: boolean;
}

export interface MistakeQuestionDto {
  questionId: string;
  block: string;
  wrongCount: number;
  topic: string | null;
  stage: string | null;
}

export interface MistakeGroupDto {
  unitCode: string;
  unitTitle: string;
  topic: string;
  questions: MistakeQuestionDto[];
}

export interface TrapDto {
  trapCode: string;
  description: string;
  unitCode: string;
  wrongCount: number;
  questionCount: number;
}

// ---- Comments on a topic document (target `topic-04:document`) ----

export interface CommentAuthorDto {
  id: string;
  name: string;
}

export interface CommentDto {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  replyCount: number;
  author: CommentAuthorDto;
  mine: boolean;
  replies?: CommentDto[] | null;
}

export interface CommentPageDto {
  items: CommentDto[];
  next: string | null;
  total: number;
}

export interface CommentLikeDto {
  id: string;
  liked: boolean;
  likes: number;
}

export interface CommentDeleteDto {
  id: string;
  deleted: boolean;
}

// ---- UI-level contracts shared by the views ----

/**
 * Discussion opened straight from a link: `?discussion=document&comment=<root comment id>`.
 * `key` = navigation key, so a new link re-opens a drawer the learner closed.
 */
export interface TalkTarget {
  kind: string;
  id: string | null;
  key: string;
}

/** Focus mode of a mini test / stage test. */
export interface FocusControl {
  blockKey: string | null;
  toggle: (blockKey: string | null) => void;
}
