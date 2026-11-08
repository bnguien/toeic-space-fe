import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useStageSets(stageId: string | undefined) {
  return useQuery({
    queryKey: vocabularyQueryKeys.stageSets(stageId ?? ""),
    queryFn: ({ signal }) => vocabularyApi.getStageSets(stageId ?? "", signal),
    enabled: !!stageId,
    staleTime: 30 * 60 * 1000,
    retry: shouldRetryQuery,
  });
}
