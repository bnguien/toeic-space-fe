import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useQuizQuestions(wordIds: readonly string[], enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.quiz(wordIds),
    queryFn: ({ signal }) => vocabularyApi.createQuiz(wordIds, signal),
    enabled: enabled && wordIds.length > 0,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: shouldRetryQuery,
  });
}
