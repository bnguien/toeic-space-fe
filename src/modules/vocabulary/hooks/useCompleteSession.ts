import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";

export function useCompleteSession() {
  return useMutation({
    mutationFn: (sessionId: string) => vocabularyApi.completeSession(sessionId),
    retry: false,
  });
}
