import type {
  ReviewMode,
  SavedWordsQuery,
  SessionSource,
  StudyQueueParams,
} from "../types/vocabulary.types";

export const vocabularyQueryKeys = {
  all: ["vocabulary"] as const,
  stages: () => [...vocabularyQueryKeys.all, "stages"] as const,
  stageSets: (stageId: string) => [...vocabularyQueryKeys.stages(), stageId, "sets"] as const,
  set: (setId: string) => [...vocabularyQueryKeys.all, "sets", setId] as const,
  quiz: (wordIds: readonly string[]) => [...vocabularyQueryKeys.all, "quiz", wordIds] as const,
  reelBackgrounds: () => [...vocabularyQueryKeys.all, "reel-backgrounds"] as const,
  /** Learner-specific data; invalidated after a study session. */
  me: () => [...vocabularyQueryKeys.all, "me"] as const,
  summary: () => [...vocabularyQueryKeys.me(), "summary"] as const,
  stageProgress: (stageId: string) =>
    [...vocabularyQueryKeys.me(), "stages", stageId, "sets"] as const,
  studyQueue: (params: StudyQueueParams) =>
    [...vocabularyQueryKeys.me(), "study-queue", params] as const,
  library: () => [...vocabularyQueryKeys.me(), "library"] as const,
  lookup: (text: string, allowAi: boolean) =>
    [...vocabularyQueryKeys.all, "lookup", text, allowAi] as const,
  /** Outside `me` so progress invalidation never refetches it. */
  preferences: () => [...vocabularyQueryKeys.all, "preferences"] as const,
  /** Start/resume of a server session; `run` changes on restart. */
  sessionStart: (mode: ReviewMode, source: SessionSource, run: number) =>
    [...vocabularyQueryKeys.all, "session", mode, source, run] as const,
  sessionById: (sessionId: string, run: number) =>
    [...vocabularyQueryKeys.all, "session", sessionId, run] as const,
  savedWords: (query?: SavedWordsQuery) =>
    query
      ? ([...vocabularyQueryKeys.me(), "words", query] as const)
      : ([...vocabularyQueryKeys.me(), "words"] as const),
};
