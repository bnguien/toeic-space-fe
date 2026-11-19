import { httpClient } from "@/services/http";

import type {
  DictationResultDto,
  GuestReadingInput,
  NewsArticleDetailDto,
  NewsArticleListDto,
  NewsArticleListParams,
  NewsReadingStateDto,
  NewsWordLookupDto,
  UpdateReadingStateRequest,
} from "../types/news.types";

const BASE = "/content/api/v1/news";
const articlePath = (slug: string) => `${BASE}/articles/${encodeURIComponent(slug)}`;

/** Drops empty / "all" filters like the Studychill client. */
const toListQuery = (params: NewsArticleListParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null && value !== "all"),
  );

export const newsApi = {
  /** GET articles — cards, totals, facets and the viewer's done/reading counts (public). */
  getArticles: async (
    params: NewsArticleListParams,
    signal?: AbortSignal,
  ): Promise<NewsArticleListDto> =>
    (
      await httpClient.get<NewsArticleListDto>(`${BASE}/articles`, {
        params: toListQuery(params),
        signal,
      })
    ).data,

  /** GET articles/{slug} — body and vocabulary (public). */
  getArticle: async (slug: string, signal?: AbortSignal): Promise<NewsArticleDetailDto> =>
    (await httpClient.get<NewsArticleDetailDto>(articlePath(slug), { signal })).data,

  /** POST articles/{slug}/open — signed in; records the first open, returns the reading state. */
  openArticle: async (slug: string): Promise<NewsReadingStateDto> =>
    (await httpClient.post<NewsReadingStateDto>(`${articlePath(slug)}/open`)).data,

  /** POST articles/{slug}/complete — signed in. */
  completeArticle: async (slug: string): Promise<NewsReadingStateDto> =>
    (await httpClient.post<NewsReadingStateDto>(`${articlePath(slug)}/complete`)).data,

  /** PUT articles/{slug}/state — signed in; partial update. */
  updateState: async (
    slug: string,
    body: UpdateReadingStateRequest,
  ): Promise<NewsReadingStateDto> =>
    (await httpClient.put<NewsReadingStateDto>(`${articlePath(slug)}/state`, body)).data,

  /** POST articles/{slug}/dictation — graded on the server (guests too); recorded when signed in. */
  checkDictation: async (
    slug: string,
    body: { sentenceId: string; text: string; revealed: boolean },
  ): Promise<DictationResultDto> =>
    (await httpClient.post<DictationResultDto>(`${articlePath(slug)}/dictation`, body)).data,

  /** POST me/merge — guest browser state merged into the account after sign-in. */
  mergeGuestReadings: async (
    items: GuestReadingInput[],
  ): Promise<{ merged: number; skipped: number }> =>
    (await httpClient.post<{ merged: number; skipped: number }>(`${BASE}/me/merge`, { items }))
      .data,

  /** POST lookup — fast-tier lookup for guests (no AI). */
  lookupAsGuest: async (body: { text: string; context?: string }): Promise<NewsWordLookupDto> =>
    (await httpClient.post<NewsWordLookupDto>(`${BASE}/lookup`, body)).data,

  /** Neural audio of a word (speech contract of PBL-107); callers fall back to speechSynthesis. */
  speechUrl: (text: string) =>
    `/content/api/v1/speech?${new URLSearchParams({ text: text.slice(0, 200) })}`,
};
