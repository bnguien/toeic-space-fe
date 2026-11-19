import { useQuery } from "@tanstack/react-query";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";
import type { VideoTrack } from "../types/video.types";

/** "Lộ trình nghe" of one track, ordered easy → hard (public; cached 10 minutes on the server). */
export function useVideoPath(track: VideoTrack) {
  return useQuery({
    queryKey: videoQueryKeys.path(track),
    queryFn: ({ signal }) => videoApi.getPath(track, signal),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
