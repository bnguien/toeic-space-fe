import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useLibrary(enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.library(),
    queryFn: ({ signal }) => vocabularyApi.getLibrary(signal),
    enabled,
    staleTime: 60 * 1000,
    retry: shouldRetryQuery,
  });
}
