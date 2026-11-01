import { httpClient } from "@/services/http";

import type {
  AiFillResultDto,
  CreateCustomWordRequest,
  ImportParseRequest,
  ImportPreviewDto,
  ImportRequest,
  ImportResultDto,
  WordLookupDto,
  WordLookupRequest,
  PreferencesDto,
  SessionAnswerRequest,
  SessionAnswerResultDto,
  StartSessionRequest,
  StudySessionDto,
  FolderDto,
  LearnerSummaryDto,
  LibraryDto,
  PagedResult,
  QuizQuestionDto,
  ReelBackgroundDto,
  ReviewRequest,
  ReviewResultDto,
  SavedWordDto,
  SavedWordsQuery,
  SaveWordRequest,
  SetDetailDto,
  SetProgressDto,
  SetSummaryDto,
  StageDto,
  StudyItemDto,
  StudyQueueParams,
  UpdateSavedWordRequest,
} from "../types/vocabulary.types";
import { getTzOffset } from "../utils/time";

const BASE = "/content/api/v1/vocabulary";
const ME = `${BASE}/me`;
const QUIZ_BATCH = 50;

const toQueueQuery = (params: StudyQueueParams): Record<string, string | number | boolean> => {
  if ("setId" in params) return { setId: params.setId };
  if ("folderId" in params) return { folderId: params.folderId };
  if ("library" in params) return { library: true };
  return { due: true, ...(params.limit ? { limit: params.limit } : {}) };
};

const toWordsQuery = ({ scope, search, page, pageSize }: SavedWordsQuery) => ({
  ...(scope.kind === "folder" ? { folderId: scope.folderId } : {}),
  ...(scope.kind === "unfiled" ? { unfiled: true } : {}),
  ...(search?.trim() ? { search: search.trim() } : {}),
  page: page ?? 1,
  pageSize: pageSize ?? 100,
  tzOffset: getTzOffset(),
});

export const vocabularyApi = {
  /** GET stages — anonymous. */
  getStages: async (signal?: AbortSignal): Promise<StageDto[]> =>
    (await httpClient.get<StageDto[]>(`${BASE}/stages`, { signal })).data,

  /** GET stages/{stageId}/sets — anonymous. */
  getStageSets: async (stageId: string, signal?: AbortSignal): Promise<SetSummaryDto[]> =>
    (
      await httpClient.get<SetSummaryDto[]>(`${BASE}/stages/${encodeURIComponent(stageId)}/sets`, {
        signal,
      })
    ).data,

  /** GET sets/{setId} — anonymous. */
  getSet: async (setId: string, signal?: AbortSignal): Promise<SetDetailDto> =>
    (await httpClient.get<SetDetailDto>(`${BASE}/sets/${encodeURIComponent(setId)}`, { signal }))
      .data,

  /** GET me/summary — authenticated. */
  getSummary: async (signal?: AbortSignal): Promise<LearnerSummaryDto> =>
    (
      await httpClient.get<LearnerSummaryDto>(`${BASE}/me/summary`, {
        params: { tzOffset: getTzOffset() },
        signal,
      })
    ).data,

  /** GET me/stages/{stageId}/sets — authenticated; only sets with progress. */
  getStageProgress: async (stageId: string, signal?: AbortSignal): Promise<SetProgressDto[]> =>
    (
      await httpClient.get<SetProgressDto[]>(
        `${BASE}/me/stages/${encodeURIComponent(stageId)}/sets`,
        { params: { tzOffset: getTzOffset() }, signal },
      )
    ).data,

  /** GET me/study-queue — authenticated; exactly one of setId, due, folderId or library. */
  getStudyQueue: async (
    params: StudyQueueParams,
    signal?: AbortSignal,
  ): Promise<StudyItemDto[]> => {
    const query = toQueueQuery(params);
    return (
      await httpClient.get<StudyItemDto[]>(`${BASE}/me/study-queue`, {
        params: { ...query, tzOffset: getTzOffset() },
        signal,
      })
    ).data;
  },

  /** POST quizzes — anonymous; batches of at most 50 word ids, answers keep the input order. */
  createQuiz: async (wordIds: readonly string[], signal?: AbortSignal) => {
    const batches: string[][] = [];
    for (let i = 0; i < wordIds.length; i += QUIZ_BATCH) {
      batches.push(wordIds.slice(i, i + QUIZ_BATCH));
    }
    const results = await Promise.all(
      batches.map(
        async (batch) =>
          (
            await httpClient.post<QuizQuestionDto[]>(
              `${BASE}/quizzes`,
              { wordIds: batch },
              { signal },
            )
          ).data,
      ),
    );
    return results.flat();
  },

  /** POST me/reviews — authenticated; idempotent per clientEventId. */
  submitReview: async (payload: ReviewRequest): Promise<ReviewResultDto> =>
    (await httpClient.post<ReviewResultDto>(`${BASE}/me/reviews`, payload)).data,

  /** GET me/library — folders with counts. */
  getLibrary: async (signal?: AbortSignal): Promise<LibraryDto> =>
    (await httpClient.get<LibraryDto>(`${ME}/library`, { signal })).data,

  /** POST me/folders */
  createFolder: async (name: string): Promise<FolderDto> =>
    (await httpClient.post<FolderDto>(`${ME}/folders`, { name })).data,

  /** PUT me/folders/{folderId} */
  updateFolder: async (folderId: string, body: { name?: string; order?: number }) =>
    (await httpClient.put<FolderDto>(`${ME}/folders/${encodeURIComponent(folderId)}`, body)).data,

  /** DELETE me/folders/{folderId} — its words become unfiled. */
  deleteFolder: async (folderId: string): Promise<void> => {
    await httpClient.delete(`${ME}/folders/${encodeURIComponent(folderId)}`);
  },

  /** GET me/words — newest first. */
  getSavedWords: async (
    query: SavedWordsQuery,
    signal?: AbortSignal,
  ): Promise<PagedResult<SavedWordDto>> =>
    (
      await httpClient.get<PagedResult<SavedWordDto>>(`${ME}/words`, {
        params: toWordsQuery(query),
        signal,
      })
    ).data,

  /** POST me/words — save an official word (idempotent). */
  saveWord: async (body: SaveWordRequest): Promise<SavedWordDto> =>
    (await httpClient.post<SavedWordDto>(`${ME}/words`, body)).data,

  /** POST me/words/custom */
  createCustomWord: async (body: CreateCustomWordRequest): Promise<SavedWordDto> =>
    (await httpClient.post<SavedWordDto>(`${ME}/words/custom`, body)).data,

  /** PUT me/words/{savedWordId} */
  updateSavedWord: async (savedWordId: string, body: UpdateSavedWordRequest) =>
    (await httpClient.put<SavedWordDto>(`${ME}/words/${encodeURIComponent(savedWordId)}`, body))
      .data,

  /** DELETE me/words/{savedWordId} */
  removeSavedWord: async (savedWordId: string): Promise<void> => {
    await httpClient.delete(`${ME}/words/${encodeURIComponent(savedWordId)}`);
  },

  /** POST me/sessions — starts a session, or resumes the active one unless `restart`. */
  startSession: async (body: StartSessionRequest): Promise<StudySessionDto> =>
    (await httpClient.post<StudySessionDto>(`${ME}/sessions`, body)).data,

  /** GET me/sessions/{id} */
  getSession: async (sessionId: string, signal?: AbortSignal): Promise<StudySessionDto> =>
    (
      await httpClient.get<StudySessionDto>(`${ME}/sessions/${encodeURIComponent(sessionId)}`, {
        signal,
      })
    ).data,

  /** POST me/sessions/{id}/answers — idempotent per clientEventId; the server re-queues. */
  answerSession: async (
    sessionId: string,
    body: SessionAnswerRequest,
  ): Promise<SessionAnswerResultDto> =>
    (
      await httpClient.post<SessionAnswerResultDto>(
        `${ME}/sessions/${encodeURIComponent(sessionId)}/answers`,
        body,
      )
    ).data,

  /** POST me/sessions/{id}/complete */
  completeSession: async (sessionId: string): Promise<StudySessionDto> =>
    (
      await httpClient.post<StudySessionDto>(
        `${ME}/sessions/${encodeURIComponent(sessionId)}/complete`,
      )
    ).data,

  /** GET me/preferences — defaults when the learner has none. */
  getPreferences: async (signal?: AbortSignal): Promise<PreferencesDto> =>
    (await httpClient.get<PreferencesDto>(`${ME}/preferences`, { signal })).data,

  /** PUT me/preferences — partial update. */
  updatePreferences: async (patch: Partial<PreferencesDto>): Promise<PreferencesDto> =>
    (await httpClient.put<PreferencesDto>(`${ME}/preferences`, patch)).data,

  /** POST lookup — enrichment of one word or phrase (AI only when `allowAi`). */
  lookup: async (body: WordLookupRequest, signal?: AbortSignal): Promise<WordLookupDto> =>
    (await httpClient.post<WordLookupDto>(`${BASE}/lookup`, body, { signal })).data,

  /** POST me/words/import/parse — server-side parser; preview only. */
  parseImport: async (body: ImportParseRequest): Promise<ImportPreviewDto> =>
    (await httpClient.post<ImportPreviewDto>(`${ME}/words/import/parse`, body)).data,

  /** POST me/words/import — 1..50 items per call; per-row failures never abort the batch. */
  importWords: async (body: ImportRequest): Promise<ImportResultDto> =>
    (await httpClient.post<ImportResultDto>(`${ME}/words/import`, body, { timeout: 60_000 })).data,

  /** POST me/words/{savedWordId}/ai-fill — fills blank fields of a custom word. */
  aiFill: async (savedWordId: string): Promise<AiFillResultDto> =>
    (
      await httpClient.post<AiFillResultDto>(
        `${ME}/words/${encodeURIComponent(savedWordId)}/ai-fill`,
      )
    ).data,

  /** GET reel-backgrounds — anonymous, random active rows. */
  getReelBackgrounds: async (count = 40, signal?: AbortSignal): Promise<ReelBackgroundDto[]> =>
    (
      await httpClient.get<ReelBackgroundDto[]>(`${BASE}/reel-backgrounds`, {
        params: { count },
        signal,
      })
    ).data,
};
