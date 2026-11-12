import { useInfiniteQuery } from "@tanstack/react-query";

import { newsApi } from "../api/news.api";
import { newsQueryKeys } from "../api/news.query-keys";
import type { NewsArticleListParams } from "../types/news.types";
import { useNewsViewer } from "./useNewsViewer";

/** Cards loaded per page of a topic row (first page + every time the row is scrolled near its end). */
export const ROW_PAGE_SIZE = 12;

/** One horizontal row of cards, paged; loads only once the row is near the viewport (`enabled`). */
export function useNewsArticleRow(filters: NewsArticleListParams, enabled: boolean) {
  const { viewerKey, resolving } = useNewsViewer();
  const params = { ...filters, pageSize: ROW_PAGE_SIZE };
  return useInfiniteQuery({
    queryKey: newsQueryKeys.list(params, viewerKey),
    queryFn: ({ pageParam, signal }) => newsApi.getArticles({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.reduce((n, page) => n + page.items.length, 0) < last.total ? last.page + 1 : undefined,
    enabled: enabled && !resolving,
    staleTime: 60_000,
    retry: false,
  });
}
