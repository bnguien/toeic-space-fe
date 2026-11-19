import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { dictationQueryKeys } from "../api/dictation.query-keys";

/** Marks roadmap / pack listings stale after a play session changed the learner's progress. */
export function useInvalidateDictationProgress() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: dictationQueryKeys.progress() }),
    [queryClient],
  );
}
