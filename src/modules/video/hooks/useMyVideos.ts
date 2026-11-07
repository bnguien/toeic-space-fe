import { useQuery } from "@tanstack/react-query";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";

/** "Video của tôi" + videos other learners share publicly. Refetched whenever the page mounts (back from the reader). */
export function useMyVideos(enabled: boolean) {
  return useQuery({
    queryKey: videoQueryKeys.myVideos(),
    queryFn: ({ signal }) => videoApi.getMyVideos(signal),
    enabled,
    refetchOnMount: "always",
    retry: false,
  });
}
