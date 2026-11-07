import type { NewsArticleListParams } from "../types/news.types";

export const newsQueryKeys = {
  all: ["news"] as const,
  /** Viewer-dependent lists (cards carry the viewer's progress). */
  lists: () => [...newsQueryKeys.all, "list"] as const,
  list: (params: NewsArticleListParams, viewer: string) =>
    [...newsQueryKeys.lists(), viewer, params] as const,
  article: (slug: string) => [...newsQueryKeys.all, "article", slug] as const,
};
