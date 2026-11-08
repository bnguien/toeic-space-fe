import { useMutation, useQueryClient } from "@tanstack/react-query";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";
import type { MyVideosDto } from "../types/video.types";

/** Removes a video from "Video của tôi" (soft delete on the server). */
export function useRemoveMyVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (watchedId: string) => videoApi.removeMyVideo(watchedId),
    onSuccess: (_data, watchedId) => {
      queryClient.setQueryData<MyVideosDto>(videoQueryKeys.myVideos(), (prev) =>
        prev ? { ...prev, mine: prev.mine.filter((video) => video.id !== watchedId) } : prev,
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: videoQueryKeys.myVideos() }),
  });
}
