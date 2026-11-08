import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { restoreSession, useSessionStatus } from "@/modules/auth";

import { videoApi } from "../api/video.api";
import { VideoReaderView } from "../components/VideoReaderView";
import type { VideoResolveDto } from "../types/video.types";
import { getVideoErrorCode, isAuthError, openVideoErrorMessage } from "../utils/open-video-error";
import { mergeWatchProgress, readLocalProgress, resumePosition } from "../utils/video-progress";
import { VIDEO_CATALOG_PATH, videoLoginUrl, videoWatchUrl } from "../utils/video-paths";
import styles from "./VideoWatchPage.module.css";

/** Navigation state from the catalog: the already resolved video, so the reader opens without a second call. */
export interface VideoWatchState {
  video?: VideoResolveDto;
  resumeAt?: number;
  startAt?: number;
  fromCatalog?: boolean;
}

/**
 * Full-screen reader route (`/games/video/watch?v=<id>&t=<s>`, no site navbar). Studychill rendered the reader in place
 * of the catalog page; here the catalog resolves first and passes the video in the navigation state, and a deep link
 * or refresh resolves it here (guests go to sign-in, errors go back to the catalog with the message).
 */
export function VideoWatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const status = useSessionStatus();
  const state = (location.state as VideoWatchState | null) ?? {};
  const requested = (searchParams.get("v") || "").trim();
  const startAt = Number(searchParams.get("t") || 0) || 0;
  const signedIn = status === "authenticated";

  const [video, setVideo] = useState<VideoResolveDto | null>(state.video ?? null);
  const [resumeAt, setResumeAt] = useState<number | null>(
    state.video ? (state.resumeAt ?? 0) : null,
  );

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    document.title = video?.title
      ? `${video.title} · Video song ngữ`
      : "Video song ngữ · TOEIC Space";
  }, [video]);

  // Deep link / refresh: resolve here (every video endpoint needs an account, like Studychill).
  useEffect(() => {
    if (video) return;
    if (!requested) {
      navigate(VIDEO_CATALOG_PATH, { replace: true });
      return;
    }
    if (status === "idle" || status === "restoring") return;
    if (status === "anonymous") {
      navigate(videoLoginUrl(requested), { replace: true });
      return;
    }
    let cancelled = false;
    videoApi
      .resolve(requested)
      .then(async (resolved) => {
        if (cancelled) return;
        let local = readLocalProgress();
        try {
          local = mergeWatchProgress(await videoApi.getProgress(), local);
        } catch {
          /* offline: the local copy is enough */
        }
        if (cancelled) return;
        setResumeAt(resumePosition(local[resolved.videoId]));
        setVideo(resolved);
        if (resolved.videoId !== requested) {
          navigate(videoWatchUrl(resolved.videoId, startAt), {
            replace: true,
            state: { video: resolved },
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isAuthError(err)) {
          navigate(videoLoginUrl(requested), { replace: true });
          return;
        }
        navigate(VIDEO_CATALOG_PATH, {
          replace: true,
          state: {
            error: openVideoErrorMessage(err, "auto"),
            code: getVideoErrorCode(err),
            videoId: requested,
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [video, requested, status, startAt, navigate]);

  const close = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch {
      /* ignore */
    }
    if (state.fromCatalog && location.key !== "default") navigate(-1);
    else navigate(VIDEO_CATALOG_PATH);
  }, [state.fromCatalog, location.key, navigate]);

  if (!video || resumeAt === null) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <span>Đang mở video…</span>
      </div>
    );
  }

  return (
    <VideoReaderView
      key={video.videoId}
      video={video}
      onClose={close}
      startAt={startAt || state.startAt || 0}
      resumeAt={startAt ? 0 : resumeAt}
      saveToServer={signedIn}
    />
  );
}
