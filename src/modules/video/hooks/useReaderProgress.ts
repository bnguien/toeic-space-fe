import { useCallback, useEffect, useRef } from "react";

import { videoApi } from "../api/video.api";
import type { VideoResolveDto } from "../types/video.types";
import { writeLocalProgress } from "../utils/video-progress";
import type { YtPlayer } from "./useYtPlayer";

/** Seconds between two server saves while playing. */
export const SERVER_SAVE_INTERVAL = 15;

interface ReaderProgressInput {
  video: VideoResolveDto;
  player: YtPlayer | null;
  time: number;
  isPlaying: boolean;
  saveToServer: boolean;
}

/**
 * Watch progress: saved locally on every pause, to the server at most every 15 s while playing and when the page is
 * hidden / left (keepalive). Reads the position from `time`, never from the player: on unmount the player is already
 * destroyed when this cleanup runs.
 */
export function useReaderProgress({
  video,
  player,
  time,
  isPlaying,
  saveToServer,
}: ReaderProgressInput) {
  const positionRef = useRef(0);
  const lastServerSaveRef = useRef(0);

  useEffect(() => {
    positionRef.current = time;
  }, [time]);

  const saveProgress = useCallback(
    (leavingPage = false) => {
      const pos = positionRef.current;
      let duration = video.duration || 0;
      try {
        if (!duration && player) duration = player.getDuration() || 0;
      } catch {
        /* player detached */
      }
      if (!duration || pos < 2) return;
      writeLocalProgress(video.videoId, { position: pos, duration, title: video.title });
      const nowSec = Date.now() / 1000;
      if (
        !saveToServer ||
        (!leavingPage && nowSec - lastServerSaveRef.current < SERVER_SAVE_INTERVAL)
      ) {
        return;
      }
      lastServerSaveRef.current = nowSec;
      videoApi
        .saveProgress(video.videoId, Math.round(pos), Math.round(duration), leavingPage)
        .catch(() => {});
    },
    [video, player, saveToServer],
  );

  useEffect(() => {
    if (!isPlaying) {
      saveProgress();
      return undefined;
    }
    const id = setInterval(() => saveProgress(), SERVER_SAVE_INTERVAL * 1000);
    return () => clearInterval(id);
  }, [isPlaying, saveProgress]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") saveProgress(true);
    };
    const onPageHide = () => saveProgress(true);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      saveProgress(true);
    };
  }, [saveProgress]);
}
