import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { SavedWordsQuery } from "../types/vocabulary.types";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useSavedWords(query: SavedWordsQuery, enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.savedWords(query),
    queryFn: ({ signal }) => vocabularyApi.getSavedWords(query, signal),
    enabled,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
  });
}
