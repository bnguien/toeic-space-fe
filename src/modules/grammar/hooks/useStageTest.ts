import { useQuery } from "@tanstack/react-query";

import { grammarApi } from "../api/grammar.api";
import { grammarQueryKeys } from "../api/grammar.query-keys";

/** Stage test without answers + the viewer's status (`Cache-Control: private, no-store`: always refetched). */
export function useStageTest(stageNum: string | null, signedIn: boolean) {
  return useQuery({
    queryKey: [...grammarQueryKeys.stageTest(stageNum || ""), signedIn] as const,
    queryFn: ({ signal }) => grammarApi.getStageTest(stageNum || "", signal),
    enabled: !!stageNum,
    staleTime: 0,
    retry: 1,
  });
}
