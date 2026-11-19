/**
 * Plays an audio file (a dictation sentence read by the server's neural voice). The speed changes through
 * playbackRate (pitch kept) so no extra file is rendered per speed.
 * `onFail` (optional) runs when loading/playing fails (e.g. server 503) to read with the browser voice.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export interface ClipOptions {
  rate?: number;
  times?: number;
  gap?: number;
  onFail?: (() => Promise<boolean>) | null;
}

export interface AudioClip {
  play: (url: string, options?: ClipOptions) => Promise<boolean>;
  stop: () => void;
  playing: boolean;
  failed: boolean;
}

type OnceResult = boolean | "blocked";

export function useAudioClip(): AudioClip {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current += 1;
    const element = audio.current;
    if (element) {
      try {
        element.pause();
      } catch {
        /* already removed */
      }
    }
    setPlaying(false);
  }, []);

  useEffect(
    () => () => {
      token.current += 1;
      const element = audio.current;
      if (element) {
        try {
          element.pause();
          element.removeAttribute("src");
          element.load();
        } catch {
          /* already removed */
        }
      }
    },
    [],
  );

  const once = useCallback(
    (url: string, rate: number) =>
      new Promise<OnceResult>((resolve) => {
        if (!audio.current) audio.current = new Audio();
        const element = audio.current;
        if (element.dataset.src !== url) {
          element.src = url;
          element.dataset.src = url;
        }
        element.currentTime = 0;
        element.playbackRate = Math.min(2, Math.max(0.5, rate));
        const done = (ok: OnceResult) => {
          element.onended = null;
          element.onerror = null;
          resolve(ok);
        };
        element.onended = () => done(true);
        element.onerror = () => {
          element.dataset.src = "";
          done(false);
        };
        // A browser blocking autoplay (no user gesture yet) is not a load error: ignore it quietly.
        element
          .play()
          .catch((error: unknown) =>
            done((error as Error)?.name === "NotAllowedError" ? "blocked" : false),
          );
      }),
    [],
  );

  const play = useCallback(
    async (url: string, { rate = 1, times = 1, gap = 700, onFail = null }: ClipOptions = {}) => {
      stop();
      const mine = token.current;
      if (!url) return false;
      setPlaying(true);
      setFailed(false);
      for (let k = 0; k < Math.max(1, times); k += 1) {
        if (k > 0) await sleep(gap);
        if (mine !== token.current) return false;
        const ok = await once(url, rate);
        if (mine !== token.current) return false;
        if (ok === "blocked") break;
        if (!ok) {
          if (onFail) {
            setPlaying(false);
            return onFail();
          }
          setFailed(true);
          break;
        }
      }
      setPlaying(false);
      return true;
    },
    [once, stop],
  );

  return useMemo(() => ({ play, stop, playing, failed }), [play, stop, playing, failed]);
}
