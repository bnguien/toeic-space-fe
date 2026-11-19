import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { newsApi } from "../api/news.api";
import { newsQueryKeys } from "../api/news.query-keys";
import { toNewsArticle } from "../utils/news-catalog";

/** Body of one article (public). */
export function useNewsArticle(slug: string) {
  return useQuery({
    queryKey: newsQueryKeys.article(slug),
    queryFn: async ({ signal }) => toNewsArticle(await newsApi.getArticle(slug, signal)),
    enabled: !!slug,
    staleTime: 10 * 60_000,
    retry: (count, error) => !(isAxiosError(error) && error.response?.status === 404) && count < 2,
  });
}
