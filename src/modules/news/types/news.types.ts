/* ---------- API contract (Content service, /content/api/v1/news) ---------- */

export type NewsStage = "c1" | "c2" | "c3" | "c4" | "c5";
export type NewsTopic =
  "business" | "technology" | "lifestyle" | "travel" | "environment" | "education";
export type NewsLength = "short" | "medium" | "long";
export type NewsReadingFilter = "reading" | "done";

export interface NewsArticleCardDto {
  slug: string;
  titleEn: string;
  titleVi: string | null;
  summaryVi: string | null;
  sourceName: string;
  publishedAt: string | null;
  stage: NewsStage;
  topic: NewsTopic;
  minutes: number;
  wordCount: number;
  coverUrl: string | null;
  coverAlt: string | null;
  featured: boolean;
  done: boolean;
  readingSeconds: number | null;
}

export interface NewsArticleListDto {
  items: NewsArticleCardDto[];
  total: number;
  page: number;
  pageSize: number;
  facets: { stage: Partial<Record<NewsStage, number>>; topic: Partial<Record<NewsTopic, number>> };
  doneCount: number;
  readingCount: number;
}

export interface NewsArticleListParams {
  stage?: NewsStage | "all";
  topic?: NewsTopic | "all";
  q?: string;
  length?: NewsLength | "all";
  state?: NewsReadingFilter;
  page?: number;
  pageSize?: number;
}

export interface NewsSentenceDto {
  id: string;
  text: string;
  translation: string;
}

export interface NewsParagraphDto {
  id: string;
  sentences: NewsSentenceDto[];
}

export interface NewsVocabularyItemDto {
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaning: string;
  level: "easy" | "medium" | "hard";
}

export interface NewsArticleDetailDto {
  slug: string;
  titleEn: string;
  titleVi: string | null;
  summaryVi: string | null;
  stage: NewsStage;
  topic: NewsTopic;
  minutes: number;
  wordCount: number;
  sourceName: string;
  sourceUrl: string;
  sourceSeries: string | null;
  author: string | null;
  publishedAt: string | null;
  license: string;
  attribution: string;
  coverUrl: string | null;
  coverAlt: string | null;
  coverCredit: string | null;
  coverLicense: string | null;
  coverSourceUrl: string | null;
  audioUrl: string | null;
  paragraphs: NewsParagraphDto[];
  vocabulary: NewsVocabularyItemDto[];
}

export interface DictationWordDto {
  text: string;
  ok: boolean;
}

export interface DictationResultDto {
  correct: boolean;
  words: DictationWordDto[];
  correctCount: number;
  total: number;
  extra: number;
  recorded: boolean;
}

export interface NewsDictationEntryDto {
  passed: boolean;
  unaided: boolean;
  revealed: boolean;
  attempts: number;
  input: string | null;
  result: DictationResultDto | null;
}

export type TranslationMode = "english" | "bilingual";
export type BilingualLayout = "inline" | "columns";
export type BrainHackModeKey = "english" | "vietnamese" | "dictation";

export interface NewsReaderSettingsDto {
  palette?: string | null;
  mode?: TranslationMode | null;
  layout?: BilingualLayout | null;
  fontSize?: number | null;
  dark?: boolean | null;
  panelWidth?: number | null;
  split?: number | null;
  showSuggested?: boolean | null;
  showLookedUp?: boolean | null;
  showMeaning?: boolean | null;
  hackMode?: BrainHackModeKey | null;
  voice?: string | null;
}

export interface NewsReadingStateDto {
  slug: string;
  done: boolean;
  openedAt: string;
  completedAt: string | null;
  readingSeconds: number;
  knownWords: string[];
  notes: string;
  dictation: Record<string, NewsDictationEntryDto>;
  dictationTotal: number;
  settings: NewsReaderSettingsDto | null;
  settingsUpdatedAt: string | null;
  updatedAt: string;
}

export interface NewsDictationEntryInput {
  passed: boolean;
  unaided: boolean;
  revealed: boolean;
  attempts: number;
  input: string | null;
}

export interface UpdateReadingStateRequest {
  readingSeconds?: number;
  knownWords?: string[];
  notes?: string;
  dictation?: Record<string, NewsDictationEntryInput>;
  resetDictation?: boolean;
  settings?: NewsReaderSettingsDto;
}

export interface GuestReadingInput {
  slug: string;
  readingSeconds: number;
  completed: boolean;
  knownWords?: string[];
  notes?: string;
  dictation?: Record<string, NewsDictationEntryInput>;
  updatedAt?: string;
}

/** Shared shape of the PBL-75 lookup result (vocabulary and news guest lookup). */
export interface NewsWordLookupDto {
  text: string;
  kind: "word" | "phrase";
  headword: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  meaningVi: string | null;
  example: string | null;
  exampleVi: string | null;
  phraseType: string | null;
  complete: boolean;
  aiUsed: boolean;
  officialWordId: string | null;
}

/* ---------- UI models ---------- */

/** One card of the list page. `progress`: 100 done, 50 read for a while, 0 unopened. */
export interface NewsCard {
  slug: string;
  topic: NewsTopic;
  titleEn: string;
  titleVi: string;
  stage: NewsStage;
  minutes: number;
  sourceName: string;
  coverUrl: string | null;
  isNew: boolean;
  progress: number;
}

/** Article as the reader uses it. */
export interface NewsArticle {
  slug: string;
  titleEn: string;
  titleVi: string;
  summaryVi: string;
  stage: NewsStage;
  topic: NewsTopic;
  minutes: number;
  sourceName: string;
  sourceUrl: string;
  author: string;
  publishedAt: string | null;
  attribution: string;
  coverUrl: string | null;
  coverAlt: string;
  coverCredit: string;
  coverSourceUrl: string;
  audioUrl: string;
  paragraphs: NewsParagraphDto[];
  vocabulary: NewsVocabularyItemDto[];
}

/** A dictation record of one sentence as the reader keeps it. */
export interface DictationRecord {
  passed?: boolean;
  unaided?: boolean;
  revealed?: boolean;
  attempts?: number;
  input?: string;
  result?: DictationResultDto;
}

export type DictationProgress = Record<string, DictationRecord>;

/** A word or phrase shown in the lookup card / "Đã tra" list. */
export interface LookedUpWord {
  word: string;
  rect?: DOMRect;
  sentence?: NewsSentenceDto;
  inArticle?: boolean;
  isPhrase?: boolean;
  pending?: boolean;
  ipa?: string;
  partOfSpeech?: string;
  meaning?: string;
  source?: string;
  officialWordId?: string | null;
}
