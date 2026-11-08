import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useVocabularySet(setId: string | undefined) {
  return useQuery({
    queryKey: vocabularyQueryKeys.set(setId ?? ""),
    queryFn: ({ signal }) => vocabularyApi.getSet(setId ?? "", signal),
    enabled: !!setId,
    staleTime: 30 * 60 * 1000,
    retry: shouldRetryQuery,
  });
}
