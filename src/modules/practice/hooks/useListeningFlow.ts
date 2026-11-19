import { useCallback, useEffect, useRef, useState } from "react";

import { examAudio, isCurrentSrc } from "../utils/examAudio";

export type ListeningStatus = "loading" | "blocked" | "playing" | "answering" | "error";

export interface ListeningFlowOptions {
  /** Audio of the group or of the directions; null/empty = no audio (error window). */
  src: string | null | undefined;
  /** Seconds to answer after the audio ends (see `answerWindowSeconds`); 0 = move on at once. */
  afterSeconds: number;
  /** Seconds to wait when the audio fails to load (default: `afterSeconds`). */
  errorSeconds?: number;
  /** Called once when the window is over (or `skip()`): go to the next step. */
  onDone: () => void;
}

export interface ListeningFlow {
  status: ListeningStatus;
  /** 0..1 playback progress. */
  progress: number;
  /** Whole seconds left of the answer window, null while playing. */
  windowLeft: number | null;
  windowTotal: number | null;
  /** The audio is over (or failed): "Tiếp ›" / Enter may skip the rest of the window. */
  finished: boolean;
  /** "▶ Phát" when autoplay was blocked; only works before the audio has ever played. */
  play: () => void;
  /** Ends the step now (only meaningful once `finished`). */
  skip: () => void;
}

/**
 * Plays one audio ONCE on the shared exam element, then counts the answer window and calls
 * `onDone` (port of StudyChill `useListeningFlow`): no pause/seek/speed; a pause from a media key
 * or headset resumes playback; a blocked autoplay shows "blocked". Changing `src` needs a remount
 * (put `key={group.id}` on the calling component): state is not reset in place.
 */
export function useListeningFlow({
  src,
  afterSeconds,
  errorSeconds = afterSeconds,
  onDone,
}: ListeningFlowOptions): ListeningFlow {
  const [status, setStatus] = useState<ListeningStatus>("loading");
  const [progress, setProgress] = useState(0);
  const [window_, setWindow] = useState<{ endsAt: number; total: number } | null>(null);
  const [now, setNow] = useState(0);
  const done = useRef(false);
  const played = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDoneRef.current();
  }, []);

  useEffect(() => {
    const audio = examAudio();
    let cancelled = false;
    let begun = false;
    const begin = (reason: "ended" | "error") => {
      if (cancelled || begun) return;
      begun = true;
      const total = reason === "error" ? errorSeconds : afterSeconds;
      const start = Date.now();
      setStatus(reason === "error" ? "error" : "answering");
      if (reason !== "error") setProgress(1);
      setNow(start);
      setWindow({ endsAt: start + total * 1000, total });
    };

    if (!src || !audio) {
      const timer = window.setTimeout(() => begin("error"), 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    const mine = () => !cancelled && isCurrentSrc(audio, src);
    const onEnded = () => mine() && begin("ended");
    const onError = () => mine() && begin("error");
    const onTime = () => {
      if (mine() && audio.duration && Number.isFinite(audio.duration)) {
        setProgress(Math.min(1, audio.currentTime / audio.duration));
      }
    };
    const onPlaying = () => {
      if (!mine()) return;
      played.current = true;
      setStatus("playing");
    };
    // The real exam cannot be paused: a pause from a media key / headset resumes playback.
    const onPause = () => {
      if (mine() && played.current && !audio.ended && !begun) void audio.play().catch(() => {});
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.playbackRate = 1;
    audio.src = src;
    audio.play().catch((error: unknown) => {
      if (cancelled) return;
      const name = (error as { name?: string } | null)?.name;
      if (name === "NotAllowedError") setStatus("blocked");
      else if (name === "NotSupportedError") begin("error");
    });
    return () => {
      cancelled = true;
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      try {
        audio.pause();
      } catch {
        /* detached */
      }
    };
  }, [src, afterSeconds, errorSeconds]);

  // Answer window after the audio.
  useEffect(() => {
    if (!window_) return;
    if (window_.total <= 0) {
      const timer = window.setTimeout(finish, 0);
      return () => window.clearTimeout(timer);
    }
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= window_.endsAt) {
        window.clearInterval(id);
        finish();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [window_, finish]);

  const play = useCallback(() => {
    if (played.current) return;
    void examAudio()
      ?.play()
      .catch(() => {});
  }, []);

  const windowLeft = window_ ? Math.max(0, Math.ceil((window_.endsAt - now) / 1000)) : null;
  return {
    status,
    progress,
    windowLeft,
    windowTotal: window_?.total ?? null,
    finished: status === "answering" || status === "error",
    play,
    skip: finish,
  };
}
