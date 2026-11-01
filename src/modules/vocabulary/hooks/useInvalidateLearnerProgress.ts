import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";

/** Refreshes summary, stage and lesson progress after a study session. */
export function useInvalidateLearnerProgress() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.me() }),
    [queryClient],
  );
}
