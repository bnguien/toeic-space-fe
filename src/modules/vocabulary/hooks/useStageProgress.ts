import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export function useStageProgress(stageId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.stageProgress(stageId ?? ""),
    queryFn: ({ signal }) => vocabularyApi.getStageProgress(stageId ?? "", signal),
    enabled: enabled && !!stageId,
    staleTime: 60 * 1000,
    retry: shouldRetryQuery,
  });
}
