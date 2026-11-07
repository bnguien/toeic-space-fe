import { useQuery } from "@tanstack/react-query";

import { dictationApi } from "../api/dictation.api";
import { dictationQueryKeys } from "../api/dictation.query-keys";

/** Levels, voices and unlock rules; static for the session. Failures fall back to defaults in the page. */
export function useDictationConfig() {
  return useQuery({
    queryKey: dictationQueryKeys.config(),
    queryFn: ({ signal }) => dictationApi.getConfig(signal),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
