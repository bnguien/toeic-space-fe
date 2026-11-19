import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import type { SessionAnswerRequest } from "../types/vocabulary.types";

/** Records one answer; the server advances and re-queues. */
export function useAnswerSession() {
  return useMutation({
    mutationFn: ({ sessionId, body }: { sessionId: string; body: SessionAnswerRequest }) =>
      vocabularyApi.answerSession(sessionId, body),
    retry: false,
  });
}
