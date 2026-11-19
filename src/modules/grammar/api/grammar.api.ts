import { httpClient } from "@/services/http";

import type {
  AnswerResultDto,
  AttemptResultDto,
  BlockKey,
  CommentDeleteDto,
  CommentDto,
  CommentLikeDto,
  CommentPageDto,
  CompleteResultDto,
  ConfirmablePart,
  GrammarPreferencesDto,
  KnownWordResultDto,
  LessonPart,
  LessonPayloadDto,
  MistakeGroupDto,
  PositionResultDto,
  ProgressDto,
  RevealDto,
  StageTestDto,
  TrapDto,
} from "../types/grammar.types";

/**
 * Grammar client (Content service, contract in toeic-space-be/docs/grammar.md). The server keeps the answers and
 * grades; guests are graded but nothing is stored. Topics are cached by TanStack Query for 5 minutes.
 */
const BASE = "/content/api/v1/grammar";
const ME = `${BASE}/me`;
const enc = encodeURIComponent;

export const grammarApi = {
  // ---- Content (anonymous) ----
  getTopic: async (topic: string, signal?: AbortSignal): Promise<LessonPayloadDto> =>
    (await httpClient.get<LessonPayloadDto>(`${BASE}/topics/${enc(topic)}`, { signal })).data,
  getStageTest: async (stage: string, signal?: AbortSignal): Promise<StageTestDto> =>
    (await httpClient.get<StageTestDto>(`${BASE}/stages/${enc(stage)}/test`, { signal })).data,

  // ---- Attempts (anonymous; a token stores progress) ----
  submitTopic: async (
    topic: string,
    block: BlockKey,
    answers: Record<string, unknown>,
  ): Promise<AttemptResultDto> =>
    (
      await httpClient.post<AttemptResultDto>(`${BASE}/topics/${enc(topic)}/attempts`, {
        block,
        answers,
      })
    ).data,
  submitStage: async (stage: string, answers: Record<string, unknown>): Promise<AttemptResultDto> =>
    (await httpClient.post<AttemptResultDto>(`${BASE}/stages/${enc(stage)}/attempts`, { answers }))
      .data,
  retryAnswer: async (
    attemptId: string,
    questionId: string,
    value: unknown,
  ): Promise<AnswerResultDto> =>
    (
      await httpClient.post<AnswerResultDto>(`${BASE}/attempts/${enc(attemptId)}/retry`, {
        questionId,
        value,
      })
    ).data,
  revealAnswer: async (attemptId: string, questionId: string): Promise<RevealDto> =>
    (await httpClient.post<RevealDto>(`${BASE}/attempts/${enc(attemptId)}/reveal`, { questionId }))
      .data,
  /** Single question (mistake book): graded like a retry but creates no attempt. */
  answerQuestion: async (questionId: string, value: unknown): Promise<AnswerResultDto> =>
    (
      await httpClient.post<AnswerResultDto>(`${BASE}/questions/${enc(questionId)}/answer`, {
        value,
      })
    ).data,
  revealQuestion: async (questionId: string): Promise<RevealDto> =>
    (await httpClient.post<RevealDto>(`${BASE}/questions/${enc(questionId)}/reveal`, {})).data,

  // ---- Progress & personalisation (signed in) ----
  getProgress: async (signal?: AbortSignal): Promise<ProgressDto> =>
    (await httpClient.get<ProgressDto>(`${ME}/progress`, { signal })).data,
  completePart: async (topic: string, part: ConfirmablePart): Promise<CompleteResultDto> =>
    (await httpClient.post<CompleteResultDto>(`${ME}/topics/${enc(topic)}/complete`, { part }))
      .data,
  savePosition: async (topic: string, part: LessonPart, anchor = ""): Promise<PositionResultDto> =>
    (
      await httpClient.put<PositionResultDto>(`${ME}/position`, {
        topic,
        part,
        anchor: String(anchor || "").slice(0, 120),
      })
    ).data,
  getKnownWords: async (topic: string, signal?: AbortSignal): Promise<string[]> =>
    (await httpClient.get<string[]>(`${ME}/known-words`, { params: { topic }, signal })).data,
  setKnownWord: async (topic: string, word: string, known: boolean): Promise<KnownWordResultDto> =>
    (await httpClient.put<KnownWordResultDto>(`${ME}/known-words`, { topic, word, known })).data,
  getMistakes: async (signal?: AbortSignal): Promise<MistakeGroupDto[]> =>
    (await httpClient.get<MistakeGroupDto[]>(`${ME}/mistakes`, { signal })).data,
  getTraps: async (signal?: AbortSignal): Promise<TrapDto[]> =>
    (await httpClient.get<TrapDto[]>(`${ME}/traps`, { signal })).data,
  getPreferences: async (): Promise<GrammarPreferencesDto> =>
    (await httpClient.get<GrammarPreferencesDto>(`${ME}/preferences`)).data,
  savePreferences: async (preferences: GrammarPreferencesDto): Promise<GrammarPreferencesDto> =>
    (await httpClient.put<GrammarPreferencesDto>(`${ME}/preferences`, preferences)).data,

  // ---- Comments (read: anonymous, write: signed in) ----
  getComments: async (target: string, before?: string | null): Promise<CommentPageDto> =>
    (
      await httpClient.get<CommentPageDto>(`${BASE}/comments`, {
        params: before ? { target, before } : { target },
      })
    ).data,
  postComment: async (
    target: string,
    content: string,
    parentId: string | null = null,
    authorName?: string,
  ): Promise<CommentDto> =>
    (
      await httpClient.post<CommentDto>(`${BASE}/comments`, {
        target,
        content,
        parentId: parentId ? Number(parentId) : null,
        authorName,
      })
    ).data,
  deleteComment: async (id: string): Promise<CommentDeleteDto> =>
    (await httpClient.delete<CommentDeleteDto>(`${BASE}/comments/${enc(id)}`)).data,
  getCommentReplies: async (id: string): Promise<CommentDto[]> =>
    (await httpClient.get<CommentDto[]>(`${BASE}/comments/${enc(id)}/replies`)).data,
  likeComment: async (id: string, liked: boolean): Promise<CommentLikeDto> =>
    (await httpClient.post<CommentLikeDto>(`${BASE}/comments/${enc(id)}/like`, { liked })).data,
};
