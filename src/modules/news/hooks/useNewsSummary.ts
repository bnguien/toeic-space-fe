import { useQuery } from "@tanstack/react-query";

import { newsApi } from "../api/news.api";
import { newsQueryKeys } from "../api/news.query-keys";
import { useNewsViewer } from "./useNewsViewer";

const PARAMS = { pageSize: 1 } as const;

/** Totals of the list page: article count, count per stage, the viewer's done / reading counts. */
export function useNewsSummary() {
  const { viewerKey, resolving } = useNewsViewer();
  return useQuery({
    queryKey: newsQueryKeys.list(PARAMS, viewerKey),
    queryFn: ({ signal }) => newsApi.getArticles(PARAMS, signal),
    enabled: !resolving,
    staleTime: 60_000,
  });
}
