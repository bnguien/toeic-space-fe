import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useVocabularyStages() {
  return useQuery({
    queryKey: vocabularyQueryKeys.stages(),
    queryFn: ({ signal }) => vocabularyApi.getStages(signal),
    staleTime: 30 * 60 * 1000,
    retry: shouldRetryQuery,
  });
}
