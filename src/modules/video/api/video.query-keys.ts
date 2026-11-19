import type { VideoTrack } from "../types/video.types";

export const videoQueryKeys = {
  all: ["video"] as const,
  catalog: () => [...videoQueryKeys.all, "catalog"] as const,
  path: (track: VideoTrack) => [...videoQueryKeys.all, "path", track] as const,
  wordInfo: (word: string) => [...videoQueryKeys.all, "word-info", word] as const,
  /** Learner-specific data. */
  me: () => [...videoQueryKeys.all, "me"] as const,
  myVideos: () => [...videoQueryKeys.me(), "videos"] as const,
  progress: () => [...videoQueryKeys.me(), "progress"] as const,
  savedWords: () => [...videoQueryKeys.me(), "saved-words"] as const,
  learnerState: (scope: string) => [...videoQueryKeys.me(), "state", scope] as const,
};
