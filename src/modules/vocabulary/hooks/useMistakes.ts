import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { MistakesQuery } from "../types/vocabulary.types";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

/** Words answered wrong and not yet answered right ("Từ sai"). */
export function useMistakes(query: MistakesQuery, enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.mistakes(query),
    queryFn: ({ signal }) => vocabularyApi.getMistakes(query, signal),
    enabled,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
  });
}
