/** DTOs of the Content service dictation API (`/content/api/v1/dictation`), JSON camelCase. */

export interface DictationLevelMeta {
  level: number;
  name: string;
  band: string;
  cefr: string;
}

export interface DictationTopic {
  key: string;
  name: string;
}

export interface DictationVoice {
  key: string;
  name: string;
  accent: string;
  accentLabel: string;
  gender: string;
  genderLabel: string;
  flag: string;
}

export interface DictationRules {
  /** From this level a pass helped by hints/keywords/meaning does not unlock the next sentence. */
  cleanPassLevel: number;
  /** From this level keywords and meaning open only after the first submission. */
  supportGatedLevel: number;
  levelOneListHideStreak: number;
  assistedRateWarning: number;
  suggestLevelUpStreak: number;
}

/** A pack with imported content; the catalog hides packs without one. */
export interface DictationPackSummary {
  pack: string;
  courseCount: number;
  itemCount: number;
}

export interface DictationConfigDto {
  levels: DictationLevelMeta[];
  topics: DictationTopic[];
  voices: DictationVoice[];
  defaultVoice: string;
  rateMin: number;
  rateMax: number;
  passScore: number;
  /** % of correct words needed to pass: 100 (every word). */
  passThreshold: number;
  rules: DictationRules;
  packs: DictationPackSummary[];
}

export type DictationStageState = "Done" | "Current" | "Locked";

/** One stage (= one course) of the TOEIC roadmap map. No sentence content. */
export interface DictationStageDto {
  number: number;
  courseId: number;
  title: string;
  itemIds: number[];
  itemCount: number;
  passedCount: number;
  passedCleanCount: number;
  stars: number;
  state: DictationStageState;
  subLevel: string;
  topics: string[];
  wordsPerSentence: number;
  vocabCount: number;
}

export interface DictationRoadmapLevelDto {
  level: number;
  name: string;
  band: string;
  cefr: string;
  itemCount: number;
  passedCount: number;
  stagesCompleted: number;
  stars: number;
  stages: DictationStageDto[];
}

export interface DictationRoadmapDto {
  authenticated: boolean;
  itemCount: number;
  passedCount: number;
  levels: DictationRoadmapLevelDto[];
}

export interface PackCourseDto {
  id: number;
  code: string;
  title: string;
  order: number;
  level: number;
  itemCount: number;
  /** Sentences of the course the signed-in learner has passed (0 for guests). */
  passedCount: number;
}

export interface PackCoursesDto {
  pack: string;
  courses: PackCourseDto[];
}

export interface DictationCourseInfoDto {
  id: number;
  code: string;
  title: string;
  pack: string;
  level: number;
}

export interface DictationExerciseDto {
  id: number;
  level: number;
  subLevel: string;
  order: number;
  topic: string;
  wordCount: number;
  maxPlays: number | null;
  unlocked: boolean;
  passed: boolean;
  passedClean: boolean;
  bestAccuracy: number;
  bestScore: number;
  attemptCount: number;
}

export interface DictationExercisesDto {
  level: number;
  levelName: string;
  levelBand: string;
  subLevel: string;
  course: DictationCourseInfoDto | null;
  authenticated: boolean;
  exercises: DictationExerciseDto[];
}

export interface SkeletonWordDto {
  before: string;
  length: number;
  after: string;
}

export interface DictationKeywordDto {
  word: string;
  meaning: string;
  partOfSpeech: string;
  ipa: string;
  cefr: string;
}

export interface DictationNoteDto {
  id: string;
  text: string;
  type: "Word" | "Phrase";
  explanation: string;
}

/** PBKDF2-SHA256 digest of every answer word (salt = sentence salt ‖ 2-byte index), base64. */
export interface WordProofDto {
  algorithm: string;
  iterations: number;
  salt: string;
  digests: string[];
}

/** Sentence frame: slot counts, punctuation, meaning and keywords — never the answer letters. */
export interface DictationSkeletonDto {
  words: SkeletonWordDto[];
  wordCount: number;
  translation: string;
  level: number;
  keywords: DictationKeywordDto[];
  proof: WordProofDto;
  ipa: string;
  notes: DictationNoteDto[];
}

export interface CourseVocabWordDto {
  word: string;
  lemma: string;
  meaning: string;
  partOfSpeech: string;
  ipa: string;
  /** 1-based sentence number in the course. */
  sentence: number;
}

export interface CourseVocabDto {
  course: { id: number; title: string; level: number; pack: string; itemCount: number };
  words: CourseVocabWordDto[];
}

export type HintMode = "FirstLetter" | "RevealWord";

export interface DictationHintRequest {
  itemId: number;
  userText: string;
  mode: HintMode;
}

export interface DictationHintDto {
  index: number;
  total: number;
  mode: HintMode;
  length: number;
  word: string | null;
  letter: string | null;
}

export interface DictationCheckRequest {
  itemId: number;
  userText: string;
  voice?: string;
  hintCount?: number;
  assisted?: boolean;
  dryRun?: boolean;
}

export type CheckWordStatus = "Correct" | "Wrong" | "Missing" | "Extra";

export interface CheckWordDto {
  text: string;
  status: CheckWordStatus;
  typed: string | null;
}

export interface DictationCheckDto {
  accuracy: number;
  /** True only when every word is correct (same rule as the client). */
  isCorrect: boolean;
  correctCount: number;
  totalCount: number;
  words: CheckWordDto[];
  correctText: string;
  translation: string;
  dryRun: boolean;
  score: number;
  bestAccuracy: number;
  saved: boolean;
  assisted: boolean;
  passedClean: boolean;
  unlocksNext: boolean;
  nextUnlocked: boolean;
}

export interface DictationSummaryDto {
  authenticated: boolean;
  passedCount: number;
  totalCount: number;
  accuracy: number;
}

/** Sound effect preferences (volume, countdown tick style, chime style, master switch). */
export interface SoundPrefs {
  enabled: boolean;
  volume: number;
  tick: string;
  chime: string;
}

/** Play settings of one mode (Cơ bản / Pro); opaque to the server. */
export type PlaySettingsBlob = Record<string, unknown>;

/**
 * Learner state kept on the server for signed-in learners (guests keep it in localStorage):
 * stars per stage key and study seconds per local day merge by max; settings, voice and sound
 * replace the stored value only when their client timestamp (ms) is newer.
 */
export interface DictationLearnerStateDto {
  stars: Record<string, number>;
  dailySeconds: Record<string, number>;
  settings: { basic: PlaySettingsBlob | null; pro: PlaySettingsBlob | null };
  settingsUpdatedAt: number;
  voice: string;
  voiceUpdatedAt: number;
  sound: SoundPrefs | null;
  soundUpdatedAt: number;
}

export type DictationLearnerStatePatch = Partial<DictationLearnerStateDto>;
