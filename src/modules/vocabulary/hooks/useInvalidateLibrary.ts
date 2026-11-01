import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";

/** Refreshes folders, saved words, study queues (save state) and the summary. */
export function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.me() }),
    [queryClient],
  );
}
