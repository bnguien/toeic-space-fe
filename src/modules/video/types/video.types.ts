/* DTOs of the Content service video API (`/content/api/v1/videos`). Contract: docs/videos.md (backend). */

export type VideoTrack = "easy" | "medium" | "hard";

export interface LangDto {
  code: string;
  name: string;
}

/** POST resolve — the opened video with its subtitle languages. */
export interface VideoResolveDto {
  videoId: string;
  title: string;
  duration: number;
  /** Original subtitle language already mapped to a code that exists in `manual`/`auto`. */
  language: string;
  manual: LangDto[];
  auto: LangDto[];
}

/** `[start s, duration s, text, per-word offsets in s from the cue start?]` (offsets match `text.split(" ")`). */
export type Cue = [number, number, string] | [number, number, string, number[]];

export interface VideoSubtitlesDto {
  videoId: string;
  cues: Record<string, Cue[]>;
  counts: Record<string, number>;
  unavailable: string[];
  /** Lowercase word → "B1" | "B2" | "C1" | "C2" | "TOEIC". */
  levels: Record<string, string>;
}

/** 202 body while the server prepares subtitles in the background. */
export interface VideoSubtitlesProcessingDto {
  status: "processing";
  retryAfter: number;
  videoId: string;
}

export type VideoSubtitlesResponse = VideoSubtitlesDto | VideoSubtitlesProcessingDto;

export interface CatalogVideoDto {
  videoId: string;
  title: string;
  duration: number;
  level: string;
  channelTitle: string;
  thumbnail: string;
  subtitleStatus: "unknown" | "available" | "missing";
  difficulty: number;
  cefr: string;
  track: VideoTrack | "";
  levelSource: "estimate" | "subtitles";
}

export interface CatalogTopicPageDto {
  slug: string;
  title: string;
  videos: CatalogVideoDto[];
  hasMore: boolean;
  nextOffset: number;
}

export interface CatalogTopicDto extends CatalogTopicPageDto {
  tracks: Record<VideoTrack, number>;
}

export interface CatalogHomeDto {
  topics: CatalogTopicDto[];
}

export interface CatalogPathVideoDto extends CatalogVideoDto {
  topic: string;
  topicTitle: string;
}

export interface CatalogPathDto {
  track: VideoTrack;
  tracks: Record<VideoTrack, number>;
  videos: CatalogPathVideoDto[];
}

export interface WatchProgressDto {
  videoId: string;
  title: string;
  duration: number;
  position: number;
  percent: number;
  completed: boolean;
  updatedAt: string;
}

export interface SaveProgressResultDto {
  videoId: string;
  position: number;
  percent: number;
  completed: boolean;
}

export interface WatchedVideoDto {
  id: string;
  videoId: string;
  title: string;
  duration: number;
  language: string;
  isPublic: boolean;
  openCount: number;
  mine: boolean;
  userName: string;
  userAvatar: string;
  /** How many learners share this video publicly (cards are grouped by video). */
  shareCount: number;
  thumbnail: string;
  lastOpenedAt: string;
}

export interface MyVideosDto {
  mine: WatchedVideoDto[];
  shared: WatchedVideoDto[];
}

export interface SetVideoPublicRequest {
  isPublic: boolean;
  /** Snapshot shown on the shared card (the access token carries no name). */
  displayName?: string;
  avatarUrl?: string;
}

export interface SetVideoPublicResultDto {
  video: WatchedVideoDto;
  duplicate: { count: number; firstBy: string } | null;
}

/** A library word as seen by the reader (transcript word → saved entry). */
export interface VideoSavedWordDto {
  savedWordId: string;
  wordId: string;
  headword: string;
  normalizedHeadword: string;
  folderId: string | null;
  note: string | null;
  meaningVi: string;
  phonetic: string;
  partOfSpeech: string;
  isCustom: boolean;
  savedAt: string;
}

export interface VideoSavedWordsDto {
  total: number;
  items: VideoSavedWordDto[];
}

export interface ClozeCheckRequest {
  lang: string;
  cue: number;
  /** Token index → typed text ("" = answer revealed before typing). */
  answers: Record<string, string>;
}

export interface ClozeCheckResultDto {
  results: Record<string, boolean>;
}

export interface RewriteCheckRequest {
  lang: string;
  cue: number;
  words: string[];
}

export interface RewriteCheckResultDto {
  correct: boolean;
}

/** `cache` = stored glosses only · `free` = + catalog, dictionary, translation · `ai` = + AI (signed in). */
export type GlossLevel = "cache" | "free" | "ai";

export interface GlossEntryDto {
  /** Vietnamese meaning. */
  meaning: string;
  ipa: string;
  /** Lowercase English part of speech ("" when unknown). */
  partOfSpeech: string;
  example: string;
  exampleTranslation: string;
  /** English definition. */
  definition: string;
  /** Tier that gave the meaning (cache, catalog, dictionary, google, mymemory, ai). */
  source: string;
  officialWordId?: string | null;
}

export interface GlossResultDto {
  gloss: Record<string, GlossEntryDto>;
  /** Words still without a Vietnamese meaning. */
  missing: string[];
  level: GlossLevel;
}

export interface WordDefinitionDto {
  partOfSpeech: string;
  definition: string;
  example: string;
}

export interface WordFamilyDto {
  word: string;
  meaning: string;
  partOfSpeech: string;
}

export interface WordInfoDto {
  word: string;
  ipa: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  definitions: WordDefinitionDto[];
  family: WordFamilyDto[];
  base: Partial<GlossEntryDto>;
}

export interface WordMeaningsDto {
  items: Record<string, GlossEntryDto>;
}

/** Error payload (ProblemDetails) of the video API; extension fields depend on `code`. */
export interface VideoProblemDto {
  status?: number;
  detail?: string;
  code?: string;
  videoId?: string;
  unavailable?: string[];
  suggested?: string;
}

export type VideoErrorCode =
  | "invalid_video_url"
  | "video_quota_exceeded"
  | "no_english"
  | "video_unavailable"
  | "lang_unavailable"
  | "upstream_unavailable"
  | "video_topic_not_found"
  | "watched_video_not_found"
  | "subtitle_cue_not_found"
  | "invalid_word"
  | "validation_error"
  | "rate_limited";

/** Per-learner video state persisted server-side (Studychill kept it in localStorage). */
export interface VideoLearnerStateDto {
  /** Reader settings object (camelCase keys); null = never saved. */
  readerSettings: Record<string, unknown> | null;
  listenMode: string;
  /** "easy" | "medium" | "hard" | "" (not chosen). */
  pathTrack: VideoTrack | "";
  /** ISO time of the last server change, "" when never saved. */
  updatedAt: string;
}

export interface UpdateVideoLearnerStateRequest {
  readerSettings?: Record<string, unknown>;
  listenMode?: string;
  pathTrack?: VideoTrack;
}
