import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { StudyQueueParams } from "../types/vocabulary.types";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

/** Word statuses of a lesson for list views. */
export function useStudyQueue(params: StudyQueueParams, enabled: boolean) {
  return useQuery({
    queryKey: vocabularyQueryKeys.studyQueue(params),
    queryFn: ({ signal }) => vocabularyApi.getStudyQueue(params, signal),
    enabled,
    staleTime: 60 * 1000,
    retry: shouldRetryQuery,
  });
}
