import { useCallback, useEffect, useRef, useState } from "react";

/** Speeds of the practice player. */
export const PLAYER_RATES = [0.75, 0.9, 1, 1.15, 1.25, 1.5] as const;
/** "↺ 3s" step. */
export const PLAYER_BACK_SECONDS = 3;

export interface AudioPlayerOptions {
  /** Starts playing whenever `src` changes (group change); a blocked autoplay sets `blocked`. */
  autoplay?: boolean;
  /** Initial speed (from the exam config: 1 / 1.15 / 1.25); kept across sources. */
  initialRate?: number;
}

export interface AudioPlayer {
  playing: boolean;
  /** Seconds. */
  currentTime: number;
  /** Seconds; 0 until known. */
  duration: number;
  rate: number;
  /** The browser refused autoplay: the learner has to press play. */
  blocked: boolean;
  /** The source failed to load. */
  failed: boolean;
  loading: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Seeks to an absolute time (seconds). */
  seek: (seconds: number) => void;
  /** Seeks to a 0..1 position (waveform click). */
  seekRatio: (ratio: number) => void;
  /** Rewinds `seconds` (default 3). */
  back: (seconds?: number) => void;
  setRate: (rate: number) => void;
}

const clampRate = (rate: number) => Math.min(1.5, Math.max(0.75, rate));

/**
 * Practice audio player (port of the StudyChill workspace player): play/pause, seek, −3 s and a
 * 0.75–1.5× speed. Owns one detached `Audio` element; pauses and releases it on unmount.
 */
export function useAudioPlayer(
  src: string | null | undefined,
  { autoplay = false, initialRate = 1 }: AudioPlayerOptions = {},
): AudioPlayer {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState({
    src: src ?? null,
    playing: false,
    currentTime: 0,
    duration: 0,
    blocked: false,
    failed: false,
    loading: Boolean(src),
  });
  const [rate, setRateState] = useState(() => clampRate(initialRate));
  const rateRef = useRef(rate);

  // A new source resets the visible state during render (no stale time from the last group).
  if (state.src !== (src ?? null)) {
    setState({
      src: src ?? null,
      playing: false,
      currentTime: 0,
      duration: 0,
      blocked: false,
      failed: false,
      loading: Boolean(src),
    });
  }

  useEffect(() => {
    if (!src) return;
    audio.current ??= typeof Audio === "undefined" ? null : new Audio();
    const element = audio.current;
    if (!element) return;
    let cancelled = false;
    const patch = (next: Partial<typeof state>) => {
      if (!cancelled) setState((current) => ({ ...current, ...next }));
    };
    const onTime = () => patch({ currentTime: element.currentTime });
    const onMeta = () =>
      patch({ duration: Number.isFinite(element.duration) ? element.duration : 0, loading: false });
    const onPlay = () => patch({ playing: true, blocked: false, loading: false });
    const onPause = () => patch({ playing: false });
    const onEnded = () => patch({ playing: false, currentTime: element.duration || 0 });
    const onError = () => patch({ failed: true, loading: false, playing: false });
    const onWaiting = () => patch({ loading: true });
    const onCanPlay = () => patch({ loading: false });
    element.addEventListener("timeupdate", onTime);
    element.addEventListener("loadedmetadata", onMeta);
    element.addEventListener("durationchange", onMeta);
    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    element.addEventListener("waiting", onWaiting);
    element.addEventListener("canplay", onCanPlay);
    element.preload = "auto";
    element.src = src;
    element.playbackRate = rateRef.current;
    if (autoplay) {
      element.play().catch((error: unknown) => {
        if ((error as { name?: string } | null)?.name === "NotAllowedError")
          patch({ blocked: true });
      });
    }
    return () => {
      cancelled = true;
      element.removeEventListener("timeupdate", onTime);
      element.removeEventListener("loadedmetadata", onMeta);
      element.removeEventListener("durationchange", onMeta);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
      element.removeEventListener("waiting", onWaiting);
      element.removeEventListener("canplay", onCanPlay);
      element.pause();
    };
  }, [src, autoplay]);

  useEffect(
    () => () => {
      const element = audio.current;
      if (!element) return;
      element.pause();
      element.removeAttribute("src");
      element.load();
    },
    [],
  );

  const play = useCallback(() => {
    void audio.current?.play().catch(() => {});
  }, []);
  const pause = useCallback(() => audio.current?.pause(), []);
  const toggle = useCallback(() => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => {});
    else element.pause();
  }, []);
  const seek = useCallback((seconds: number) => {
    const element = audio.current;
    if (!element) return;
    const max = Number.isFinite(element.duration) ? element.duration : seconds;
    element.currentTime = Math.min(max, Math.max(0, seconds));
    setState((current) => ({ ...current, currentTime: element.currentTime }));
  }, []);
  const seekRatio = useCallback(
    (ratio: number) => {
      const element = audio.current;
      if (element && Number.isFinite(element.duration)) seek(ratio * element.duration);
    },
    [seek],
  );
  const back = useCallback(
    (seconds = PLAYER_BACK_SECONDS) => seek((audio.current?.currentTime ?? 0) - seconds),
    [seek],
  );
  const setRate = useCallback((next: number) => {
    const value = clampRate(next);
    rateRef.current = value;
    if (audio.current) audio.current.playbackRate = value;
    setRateState(value);
  }, []);

  return {
    playing: state.playing,
    currentTime: state.currentTime,
    duration: state.duration,
    rate,
    blocked: state.blocked,
    failed: state.failed,
    loading: state.loading,
    play,
    pause,
    toggle,
    seek,
    seekRatio,
    back,
    setRate,
  };
}
