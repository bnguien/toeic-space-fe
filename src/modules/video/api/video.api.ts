import { httpClient } from "@/services/http";

import type {
  CatalogHomeDto,
  CatalogPathDto,
  CatalogTopicPageDto,
  ClozeCheckResultDto,
  GlossLevel,
  GlossResultDto,
  MyVideosDto,
  RewriteCheckResultDto,
  SaveProgressResultDto,
  SetVideoPublicRequest,
  SetVideoPublicResultDto,
  UpdateVideoLearnerStateRequest,
  VideoLearnerStateDto,
  VideoResolveDto,
  VideoSavedWordsDto,
  VideoSubtitlesResponse,
  VideoTrack,
  WatchProgressDto,
  WordInfoDto,
  WordMeaningsDto,
} from "../types/video.types";

const BASE = "/content/api/v1/videos";
const ME = `${BASE}/me`;
const id = (value: string) => encodeURIComponent(value);

/** Word audio: neural TTS of the speech endpoint (callers fall back to `speechSynthesis`). */
export const SPEECH_URL = "/content/api/v1/speech";
export const speechUrl = (text: string, voice = "andrew"): string =>
  `${SPEECH_URL}?${new URLSearchParams({ text: text.slice(0, 200), voice }).toString()}`;

export const videoApi = {
  /** POST resolve — link or bare id → video + subtitle languages (records "Video của tôi"). */
  resolve: async (url: string, signal?: AbortSignal): Promise<VideoResolveDto> =>
    (await httpClient.post<VideoResolveDto>(`${BASE}/resolve`, { url }, { signal })).data,

  /** GET {videoId}/subs — 200 cues, or 202 `{status:"processing"}` while the server prepares them. */
  getSubs: async (
    videoId: string,
    langs: readonly string[],
    signal?: AbortSignal,
  ): Promise<VideoSubtitlesResponse> =>
    (
      await httpClient.get<VideoSubtitlesResponse>(`${BASE}/${id(videoId)}/subs`, {
        params: { langs: langs.join(",") },
        signal,
      })
    ).data,

  /** GET catalog — anonymous; every topic with its first page. */
  getCatalog: async (signal?: AbortSignal): Promise<CatalogHomeDto> =>
    (await httpClient.get<CatalogHomeDto>(`${BASE}/catalog`, { signal })).data,

  /** GET catalog/{slug} — anonymous; next page of one topic row. */
  getCatalogTopic: async (
    slug: string,
    offset: number,
    limit = 12,
    signal?: AbortSignal,
  ): Promise<CatalogTopicPageDto> =>
    (
      await httpClient.get<CatalogTopicPageDto>(`${BASE}/catalog/${id(slug)}`, {
        params: { offset, limit },
        signal,
      })
    ).data,

  /** POST catalog/unplayable — anonymous; the server re-checks with YouTube before hiding. */
  reportUnplayable: async (videoId: string, code: number): Promise<{ hidden: boolean }> =>
    (await httpClient.post<{ hidden: boolean }>(`${BASE}/catalog/unplayable`, { videoId, code }))
      .data,

  /** GET path — anonymous; one track ordered easy → hard. */
  getPath: async (track: VideoTrack, signal?: AbortSignal): Promise<CatalogPathDto> =>
    (await httpClient.get<CatalogPathDto>(`${BASE}/path`, { params: { track }, signal })).data,

  /** GET me/progress — own watch progress, newest first. */
  getProgress: async (signal?: AbortSignal): Promise<WatchProgressDto[]> =>
    (await httpClient.get<{ items: WatchProgressDto[] }>(`${ME}/progress`, { signal })).data.items,

  /** PUT me/progress/{videoId} — `keepalive` so a save sent while leaving the page still arrives. */
  saveProgress: async (
    videoId: string,
    position: number,
    duration: number,
    keepalive = false,
  ): Promise<SaveProgressResultDto> =>
    (
      await httpClient.put<SaveProgressResultDto>(
        `${ME}/progress/${id(videoId)}`,
        { position, duration },
        keepalive ? { adapter: "fetch", fetchOptions: { keepalive: true } } : undefined,
      )
    ).data,

  /** GET me — my videos + videos other learners share publicly. */
  getMyVideos: async (signal?: AbortSignal): Promise<MyVideosDto> =>
    (await httpClient.get<MyVideosDto>(ME, { signal })).data,

  /** PATCH me/{id} — toggle public sharing. */
  setPublic: async (
    watchedId: string,
    body: SetVideoPublicRequest,
  ): Promise<SetVideoPublicResultDto> =>
    (await httpClient.patch<SetVideoPublicResultDto>(`${ME}/${id(watchedId)}`, body)).data,

  /** DELETE me/{id} — remove from my list (soft delete). */
  removeMyVideo: async (watchedId: string): Promise<void> => {
    await httpClient.delete(`${ME}/${id(watchedId)}`);
  },

  /** GET me/state — reader settings, listen mode and path track saved for the learner. */
  getLearnerState: async (signal?: AbortSignal): Promise<VideoLearnerStateDto> =>
    (await httpClient.get<VideoLearnerStateDto>(`${ME}/state`, { signal })).data,

  /** PUT me/state — partial: only the properties sent change. */
  updateLearnerState: async (body: UpdateVideoLearnerStateRequest): Promise<VideoLearnerStateDto> =>
    (await httpClient.put<VideoLearnerStateDto>(`${ME}/state`, body)).data,

  /** GET me/saved-words — library entries keyed by headword for the reader. */
  getSavedWords: async (signal?: AbortSignal): Promise<VideoSavedWordsDto> =>
    (await httpClient.get<VideoSavedWordsDto>(`${ME}/saved-words`, { signal })).data,

  /** POST {videoId}/cloze/check — server grading of one sentence's blanks. */
  checkCloze: async (
    videoId: string,
    lang: string,
    cue: number,
    answers: Record<string, string>,
  ): Promise<ClozeCheckResultDto> =>
    (
      await httpClient.post<ClozeCheckResultDto>(`${BASE}/${id(videoId)}/cloze/check`, {
        lang,
        cue,
        answers,
      })
    ).data,

  /** POST {videoId}/rewrite/check — server check of a rewritten sentence. */
  checkRewrite: async (
    videoId: string,
    lang: string,
    cue: number,
    words: readonly string[],
  ): Promise<RewriteCheckResultDto> =>
    (
      await httpClient.post<RewriteCheckResultDto>(`${BASE}/${id(videoId)}/rewrite/check`, {
        lang,
        cue,
        words,
      })
    ).data,

  /** POST gloss — meanings for many words at the cheapest sufficient level. */
  gloss: async (words: readonly string[], level: GlossLevel = "free"): Promise<GlossResultDto> =>
    (await httpClient.post<GlossResultDto>(`${BASE}/gloss`, { words, level })).data,

  /** GET word-info?w= — word card details (anonymous, cached on the server). */
  getWordInfo: async (word: string, signal?: AbortSignal): Promise<WordInfoDto> =>
    (await httpClient.get<WordInfoDto>(`${BASE}/word-info`, { params: { w: word }, signal })).data,

  /** GET word-info?words= — basic meanings for ≤ 20 words without AI (guests). */
  getWordMeanings: async (words: readonly string[]): Promise<WordMeaningsDto["items"]> =>
    (
      await httpClient.get<WordMeaningsDto>(`${BASE}/word-info`, {
        params: { words: words.slice(0, 20).join(",") },
      })
    ).data.items ?? {},
};
