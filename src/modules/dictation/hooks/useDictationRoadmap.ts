import { useQuery } from "@tanstack/react-query";

import { useSessionStatus } from "@/modules/auth";

import { dictationApi } from "../api/dictation.api";
import { dictationQueryKeys } from "../api/dictation.query-keys";

/** TOEIC roadmap with the learner's progress; refetched on every visit so stars stay current. */
export function useDictationRoadmap() {
  const status = useSessionStatus();
  const resolving = status === "idle" || status === "restoring";
  return useQuery({
    queryKey: [...dictationQueryKeys.roadmap(), status === "authenticated"],
    queryFn: ({ signal }) => dictationApi.getRoadmap(signal),
    enabled: !resolving,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
