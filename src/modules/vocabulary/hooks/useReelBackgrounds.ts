import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";

/** Background videos are decorative: failures fall back to a plain surface. */
export function useReelBackgrounds(enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.reelBackgrounds(),
    queryFn: ({ signal }) => vocabularyApi.getReelBackgrounds(40, signal),
    enabled,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
