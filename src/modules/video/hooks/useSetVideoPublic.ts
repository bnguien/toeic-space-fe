import { useMutation, useQueryClient } from "@tanstack/react-query";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";
import type { MyVideosDto, SetVideoPublicRequest } from "../types/video.types";

interface SetPublicVariables extends SetVideoPublicRequest {
  watchedId: string;
}

/** Public/private switch of one of my videos: flips the card at once, then reloads the lists. */
export function useSetVideoPublic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ watchedId, ...body }: SetPublicVariables) => videoApi.setPublic(watchedId, body),
    onMutate: ({ watchedId, isPublic }) => {
      queryClient.setQueryData<MyVideosDto>(videoQueryKeys.myVideos(), (prev) =>
        prev
          ? {
              ...prev,
              mine: prev.mine.map((video) =>
                video.id === watchedId ? { ...video, isPublic } : video,
              ),
            }
          : prev,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: videoQueryKeys.myVideos() }),
  });
}
