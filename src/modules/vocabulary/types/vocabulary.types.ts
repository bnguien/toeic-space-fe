/** Mirrors the PBL-75 Content service DTOs (`/content/api/v1/vocabulary`). */

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "preposition"
  | "conjunction"
  | "pronoun"
  | "determiner"
  | "interjection"
  | "phrase"
  | "other";

/** How the server serializes the enum ("Verb"); it reads either case. */
export type PartOfSpeechWire = Capitalize<PartOfSpeech>;

export type ProgressStatus = "New" | "Learning" | "Mastered";

export type ReviewGrade = "Forget" | "Hard" | "Good" | "Easy" | "Seen";

/** Grades the learner picks on a flashcard. */
export type SelfGrade = Exclude<ReviewGrade, "Seen">;

export type ReviewMode = "Flashcard" | "Quiz" | "Reel";

/** URL segment of `/vocabulary/learn/:mode`. */
export const STUDY_MODES = ["flashcard", "quiz", "reel"] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

export interface StageDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  toeicTarget: number | null;
  setCount: number;
  wordCount: number;
}

export interface SetSummaryDto {
  id: string;
  stageId: string;
  slug: string;
  title: string;
  order: number;
  wordCount: number;
  /** First 3 headwords. */
  previewWords: string[];
  /** Last headword of the lesson. */
  lastWord: string;
}

export interface WordDto {
  id: string;
  headword: string;
  phonetic: string;
  /** PascalCase from the server; normalise with `posKey`. */
  partOfSpeech: PartOfSpeechWire | PartOfSpeech;
  meaningVi: string;
  definitionEn: string;
  example: string;
  exampleVi: string;
  cefr: string;
  synonyms: string[];
  /** Learner's note (contract v4); null for guests. */
  note?: string | null;
  /** Fields the learner overrode (contract v4). */
  personal?: PersonalField[] | null;
  /** Shared values, present only when `personal` is non-empty. */
  original?: WordOriginalDto | null;
}

/* ---------- Personal word edits (contract v4, section A) ---------- */

export const PERSONAL_FIELDS = [
  "phonetic",
  "partOfSpeech",
  "meaningVi",
  "example",
  "exampleVi",
] as const;
export type PersonalField = (typeof PERSONAL_FIELDS)[number];

export type WordOriginalDto = Pick<WordDto, PersonalField>;

/** `PUT me/word-edits/{wordId}`; only sent fields change, "" clears an override. */
export interface WordEditRequest {
  phonetic?: string;
  partOfSpeech?: PartOfSpeechWire;
  meaningVi?: string;
  example?: string;
  exampleVi?: string;
  note?: string;
  /** Clears every override first (the note stays unless sent). */
  reset?: boolean;
  tzOffset?: number;
}

export interface SetDetailDto {
  id: string;
  stageId: string;
  stageSlug: string;
  stageTitle: string;
  slug: string;
  title: string;
  order: number;
  previousSetId: string | null;
  nextSetId: string | null;
  words: WordDto[];
}

export interface ProgressDto {
  status: ProgressStatus;
  intervalDays: number;
  repetitions: number;
  /** Learner-local date `yyyy-MM-dd`. */
  dueOn: string | null;
  isDue: boolean;
  lastReviewedAt: string | null;
}

/** Days until the next review per grade; 0 keeps today's schedule unchanged. */
export interface SchedulePreviewDto {
  forget: number;
  hard: number;
  good: number;
  easy: number;
}

export interface StudyItemDto {
  word: WordDto;
  progress: ProgressDto;
  preview: SchedulePreviewDto;
  /** Library entry of this word for the learner, if saved. */
  savedWordId: string | null;
}

export interface StageProgressSummary {
  stageId: string;
  wordCount: number;
  learning: number;
  mastered: number;
  setCount: number;
  setsCompleted: number;
}

export interface NextSetDto {
  stageId: string;
  setId: string;
  title: string;
  order: number;
}

export interface LearnerSummaryDto {
  /** learning + mastered */
  learned: number;
  learning: number;
  mastered: number;
  due: number;
  streakDays: number;
  reviewedToday: number;
  stages: StageProgressSummary[];
  lessonCount: number;
  lessonsCompleted: number;
  libraryWordCount: number;
  /** First lesson in roadmap order that is not fully started. */
  nextSet: NextSetDto | null;
  /** Most recent active study session. */
  activeSession: ActiveSessionDto | null;
  dailyGoal: number;
  /** Pending mistakes (contract v4). */
  mistakes?: number;
}

export interface SetProgressDto {
  setId: string;
  wordCount: number;
  learning: number;
  mastered: number;
  due: number;
}

export interface QuizOptionDto {
  wordId: string;
  headword: string;
}

export interface QuizQuestionDto {
  wordId: string;
  /** meaningVi of the answer. */
  prompt: string;
  partOfSpeech: PartOfSpeechWire | PartOfSpeech;
  options: QuizOptionDto[];
}

export interface ReviewRequest {
  wordId: string;
  mode: ReviewMode;
  grade: ReviewGrade;
  clientEventId: string;
  tzOffset: number;
}

export interface ReviewResultDto {
  wordId: string;
  progress: ProgressDto;
  preview: SchedulePreviewDto;
  duplicate: boolean;
}

export interface ReelBackgroundDto {
  id: string;
  videoUrl: string;
  posterUrl: string;
  pageUrl: string;
  author: string;
}

/** Exactly one source: a lesson, due words, a library folder, the whole library or mistakes. */
export type StudyQueueParams =
  | { setId: string }
  | { due: true; limit?: number }
  | { folderId: string }
  | { library: true }
  | { mistakes: true };

/** Learner progress counts used by stage stations and lesson tiles. */
export interface ProgressCounts {
  wordCount: number;
  learning: number;
  mastered: number;
}

/* ---------- Learner library (contract v2) ---------- */

export interface LibraryCounts {
  wordCount: number;
  learning: number;
  mastered: number;
  due: number;
}

export interface FolderDto extends LibraryCounts {
  id: string;
  name: string;
  order: number;
}

export interface LibraryDto {
  total: number;
  unfiled: LibraryCounts;
  folders: FolderDto[];
  /** Pending mistakes (contract v4); missing on older servers. */
  mistakes?: number;
}

export interface SavedWordDto {
  id: string;
  folderId: string | null;
  note: string | null;
  savedAt: string;
  isCustom: boolean;
  word: WordDto;
  progress: ProgressDto;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** Which words the library view shows. */
export type LibraryScope =
  { kind: "all" } | { kind: "unfiled" } | { kind: "folder"; folderId: string };

/* ---------- Mistakes (contract v4, section B) ---------- */

export interface MistakeItemDto {
  word: WordDto;
  progress: ProgressDto;
  savedWordId: string | null;
  mistakeCount: number;
  lastMistakeAt: string;
}

export interface MistakesQuery {
  page?: number;
  pageSize?: number;
}

export interface SavedWordsQuery {
  scope: LibraryScope;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SaveWordRequest {
  wordId: string;
  folderId?: string | null;
  note?: string | null;
}

export interface CustomWordFields {
  headword: string;
  phonetic: string;
  partOfSpeech: PartOfSpeech;
  meaningVi: string;
  definitionEn: string;
  example: string;
  exampleVi: string;
}

export interface CreateCustomWordRequest extends CustomWordFields {
  folderId?: string | null;
  note?: string | null;
}

export interface UpdateSavedWordRequest {
  folderId?: string | null;
  note?: string | null;
  custom?: CustomWordFields;
}

/* ---------- Persisted sessions and preferences (contract v2, section C) ---------- */

export type SessionSourceKind = "Set" | "Due" | "Folder" | "Library" | "Words" | "Mistakes";
export type SessionStatus = "Active" | "Completed" | "Abandoned";

export interface SessionSourceDto {
  kind: SessionSourceKind;
  id: string | null;
  title: string | null;
}

export interface ActiveSessionDto {
  id: string;
  mode: ReviewMode;
  source: SessionSourceDto;
  position: number;
  total: number;
}

export interface SessionResultDto {
  wordId: string;
  grade: ReviewGrade;
}

export interface SessionSummaryDto {
  remembered: number;
  needReview: number;
  /** Words to review again. */
  wordIds: string[];
}

export interface StudySessionDto {
  id: string;
  mode: ReviewMode;
  source: SessionSourceDto;
  /** Index of the current card in `items`. */
  position: number;
  total: number;
  correctCount: number;
  reviewCount: number;
  status: SessionStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Full queue in current order, re-queued cards included. */
  items: StudyItemDto[];
  results: SessionResultDto[];
  summary: SessionSummaryDto | null;
}

export interface SessionAnswerResultDto extends StudySessionDto {
  review?: ReviewResultDto;
}

/** Where a session's words come from. */
export type SessionSource =
  | { setId: string }
  | { due: true; limit?: number }
  | { folderId: string }
  | { library: true }
  | { mistakes: true }
  | { wordIds: string[] };

export interface StartSessionRequest {
  mode: ReviewMode;
  setId?: string;
  folderId?: string;
  library?: boolean;
  mistakes?: boolean;
  due?: boolean;
  wordIds?: string[];
  limit?: number;
  restart?: boolean;
  tzOffset: number;
}

export interface SessionAnswerRequest {
  wordId: string;
  grade: ReviewGrade;
  clientEventId: string;
  tzOffset: number;
}

export type WorkspaceViewDto = "Roadmap" | "Library";

/* ---------- Study settings (contract v4, section C) ---------- */

export const REEL_SECONDS = [3, 5, 8, 12] as const;
export const QUIZ_SECONDS = [0, 10, 15, 20, 30] as const;
export const TICK_STYLES = [
  "wood",
  "mechanical",
  "wall",
  "digital",
  "drop",
  "drum",
  "heart",
  "off",
] as const;
export const CHIME_STYLES = ["bell", "game", "soft"] as const;
export const CARD_STYLES = ["stage", "pastel", "night"] as const;

export type TickStyle = (typeof TICK_STYLES)[number];
export type ChimeStyle = (typeof CHIME_STYLES)[number];
export type CardStyle = (typeof CARD_STYLES)[number];
export type StudyBackdropKind = "video" | "ambient";
export type StudyLayout = "portrait" | "landscape";

export interface StudySettingsDto {
  reelSeconds: (typeof REEL_SECONDS)[number];
  /** 0 = no timer. */
  quizSeconds: (typeof QUIZ_SECONDS)[number];
  hintFirstLetter: boolean;
  /** Reveal more letters near the end of the countdown. */
  hintProgressive: boolean;
  /** Also read the Vietnamese meaning. */
  speakMeaning: boolean;
  flashcardFront: "word" | "meaning";
  showExample: boolean;
  sfx: boolean;
  /** 0.1 … 1, step 0.05. */
  sfxVolume: number;
  tickStyle: TickStyle;
  chimeStyle: ChimeStyle;
  backdrop: StudyBackdropKind;
  cardStyle: CardStyle;
  /** Study frame: 9:16 or 16:9 (phones always use portrait). */
  layout: StudyLayout;
}

export interface PreferencesDto {
  fontScale: number;
  sidebarCollapsed: boolean;
  /** Expanded workspace sidebar width in px; null = default. */
  sidebarWidth: number | null;
  snowfall: boolean;
  autoPlayAudio: boolean;
  defaultMode: ReviewMode;
  dailyGoal: number;
  lastStageId: string | null;
  lastView: WorkspaceViewDto;
  lastFolderId: string | null;
  lastFolderPickerId: string | null;
  /** Always present once normalized; older servers omit it. */
  study: StudySettingsDto;
  updatedAt?: string;
}

/** `PUT me/preferences` body: top-level fields and a partial `study` object, merged by the server. */
export type PreferencesPatch = Partial<Omit<PreferencesDto, "study">> & {
  study?: Partial<StudySettingsDto>;
};

/** Router state of `/vocabulary/learn/:mode?words=1` (an explicit word list). */
export interface WordsSessionState {
  wordIds: string[];
}

/* ---------- "Thêm từ" enrichment (contract v3) ---------- */

/** Where a looked-up field came from. */
export type EnrichmentSource =
  "cache" | "catalog" | "dictionary" | "google" | "mymemory" | "ai" | "personal";

export type LookupField =
  "phonetic" | "partOfSpeech" | "meaningVi" | "definitionEn" | "example" | "exampleVi";

export type PhraseType = "idiom" | "phrasal_verb" | "collocation" | "fixed" | "literal";

export interface WordLookupRequest {
  text: string;
  context?: string;
  allowAi: boolean;
}

export interface WordLookupDto {
  text: string;
  kind: "word" | "phrase";
  headword: string;
  phonetic: string;
  partOfSpeech: string;
  meaningVi: string;
  definitionEn: string;
  example: string;
  exampleVi: string;
  cefr: string;
  phraseType: PhraseType | string | null;
  usage: string | null;
  explanation: string | null;
  literalMeaning: string | null;
  sources: Partial<Record<LookupField | string, EnrichmentSource | string>>;
  complete: boolean;
  aiUsed: boolean;
  existing: { savedWordId: string; folderId: string | null } | null;
  officialWordId: string | null;
}

export interface ImportItem {
  headword: string;
  meaningVi?: string;
  phonetic?: string;
  partOfSpeech?: string;
  example?: string;
  exampleVi?: string;
  category?: string;
}

export interface ImportPreviewItem extends ImportItem {
  line: number;
  duplicate: boolean;
  existing: boolean;
}

export interface ImportRejectedLine {
  line: number;
  text: string;
  code: string;
}

export interface ImportPreviewDto {
  items: ImportPreviewItem[];
  rejected: ImportRejectedLine[];
}

/** Exactly one of `text` (pasted list) or `json`. */
export type ImportParseRequest = { text: string } | { json: string };

export interface ImportRequest {
  items: ImportItem[];
  folderId?: string | null;
  createFoldersFromCategories: boolean;
}

export interface ImportFailure {
  /** Index within the request's `items`. */
  index: number;
  headword: string;
  code: string;
}

export interface ImportResultDto {
  created: number;
  updated: number;
  failed: ImportFailure[];
  items: SavedWordDto[];
}

export interface AiFillResultDto extends SavedWordDto {
  /** Field names the AI filled. */
  filled: string[];
}
