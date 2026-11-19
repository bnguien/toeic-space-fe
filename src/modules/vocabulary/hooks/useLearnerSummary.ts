import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useLearnerSummary(enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.summary(),
    queryFn: ({ signal }) => vocabularyApi.getSummary(signal),
    enabled,
    staleTime: 60 * 1000,
    retry: shouldRetryQuery,
  });
}
