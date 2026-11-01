import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { ReviewMode, SessionSource, StudySessionDto } from "../types/vocabulary.types";
import { getTzOffset } from "../utils/time";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

export type SessionTarget =
  { kind: "source"; mode: ReviewMode; source: SessionSource } | { kind: "id"; sessionId: string };

/**
 * Starts (or resumes) a server session once per `run`. `run > 0` asks the server to restart.
 * The result seeds the session view and is never refetched in the background.
 */
export function useStudySessionStart(target: SessionTarget, run: number) {
  const queryKey =
    target.kind === "id"
      ? vocabularyQueryKeys.sessionById(target.sessionId, run)
      : vocabularyQueryKeys.sessionStart(target.mode, target.source, run);

  return useQuery<StudySessionDto>({
    queryKey,
    queryFn: ({ signal }) =>
      target.kind === "id" && run === 0
        ? vocabularyApi.getSession(target.sessionId, signal)
        : vocabularyApi.startSession({
            ...(target.kind === "source"
              ? { mode: target.mode, ...target.source }
              : { mode: "Flashcard" }),
            restart: run > 0,
            tzOffset: getTzOffset(),
          }),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: shouldRetryQuery,
  });
}
