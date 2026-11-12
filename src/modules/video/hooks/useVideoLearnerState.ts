import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";
import type { UpdateVideoLearnerStateRequest, VideoLearnerStateDto } from "../types/video.types";

const LS_CHANGED_AT = "ts_video_state_changed_at";

/** Time (ms) of the last change made on this device (guest or signed in), 0 when none. */
export function localStateChangedAt(): number {
  try {
    return Number(localStorage.getItem(LS_CHANGED_AT)) || 0;
  } catch {
    return 0;
  }
}

export function markLocalStateChanged(): void {
  try {
    localStorage.setItem(LS_CHANGED_AT, String(Date.now()));
  } catch {
    /* private mode */
  }
}

/** Time (ms) of the server copy, 0 when the learner never saved anything. */
export const serverStateChangedAt = (state: VideoLearnerStateDto | null | undefined): number =>
  (state?.updatedAt && Date.parse(state.updatedAt)) || 0;

/**
 * Per-learner video state on the server (reader settings, listen mode, path track). Guests keep localStorage only;
 * when signed in, the newer copy wins (like Studychill's local/server progress merge): a local change made after the
 * server copy is pushed, otherwise the server copy is adopted.
 */
export function useVideoLearnerState(
  signedIn: boolean,
  /** Each consumer fetches its own copy so its merge callback always runs once per fetch. */
  scope: "reader" | "catalog",
  /** Called with the server copy each time it is fetched (sign-in merge). */
  onLoaded?: (state: VideoLearnerStateDto) => void,
) {
  const queryClient = useQueryClient();
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);
  const query = useQuery({
    queryKey: videoQueryKeys.learnerState(scope),
    queryFn: async ({ signal }) => {
      const state = await videoApi.getLearnerState(signal);
      onLoadedRef.current?.(state);
      return state;
    },
    enabled: signedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (body: UpdateVideoLearnerStateRequest) => videoApi.updateLearnerState(body),
    onSuccess: (state) => queryClient.setQueryData(videoQueryKeys.learnerState(scope), state),
  });
  const { mutate } = mutation;

  const save = useCallback(
    (body: UpdateVideoLearnerStateRequest) => {
      if (signedIn) mutate(body);
    },
    [signedIn, mutate],
  );

  return {
    state: signedIn ? (query.data ?? null) : null,
    loaded: signedIn && query.isSuccess,
    save,
  };
}
