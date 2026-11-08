import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";
import {
  inProgressList,
  mergeWatchProgress,
  readLocalProgress,
  type InProgressItem,
  type ProgressMap,
} from "../utils/video-progress";

export interface VideoProgressState {
  progress: ProgressMap;
  inProgress: InProgressItem[];
  reload: () => void;
}

/** Watch progress of the current learner: the local copy shows at once, the server copy merges in when it arrives. */
export function useVideoProgress(signedIn: boolean): VideoProgressState {
  const [local, setLocal] = useState<ProgressMap>(readLocalProgress);
  const server = useQuery({
    queryKey: videoQueryKeys.progress(),
    queryFn: ({ signal }) => videoApi.getProgress(signal),
    enabled: signedIn,
    // Coming back from the reader must show the position just saved.
    refetchOnMount: "always",
    retry: false,
  });
  const { refetch } = server;

  const progress = useMemo(
    () => (signedIn && server.data ? mergeWatchProgress(server.data, local) : local),
    [signedIn, server.data, local],
  );
  const inProgress = useMemo(() => inProgressList(progress), [progress]);

  const reload = useCallback(() => {
    setLocal(readLocalProgress());
    if (signedIn) void refetch();
  }, [signedIn, refetch]);

  return { progress, inProgress, reload };
}
