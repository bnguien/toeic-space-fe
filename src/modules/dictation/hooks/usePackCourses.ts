import { useQuery } from "@tanstack/react-query";

import { useSessionStatus } from "@/modules/auth";

import { dictationApi } from "../api/dictation.api";
import { dictationQueryKeys } from "../api/dictation.query-keys";

/** Courses of a topic pack; `passed` counts are the signed-in learner's own. */
export function usePackCourses(pack: string | null) {
  const status = useSessionStatus();
  const resolving = status === "idle" || status === "restoring";
  return useQuery({
    queryKey: [...dictationQueryKeys.packCourses(pack ?? ""), status === "authenticated"],
    queryFn: ({ signal }) => dictationApi.getPackCourses(pack ?? "", signal),
    enabled: Boolean(pack) && !resolving,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
