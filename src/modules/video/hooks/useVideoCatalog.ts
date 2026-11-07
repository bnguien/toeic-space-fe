import { useQuery } from "@tanstack/react-query";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";

/** Catalog topics with their first page (public; the server caches it for 5 minutes). */
export function useVideoCatalog() {
  return useQuery({
    queryKey: videoQueryKeys.catalog(),
    queryFn: ({ signal }) => videoApi.getCatalog(signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
