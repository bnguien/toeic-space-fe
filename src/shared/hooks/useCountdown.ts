import { useEffect, useEffectEvent, useRef, useState } from "react";

const FRAME_MS = 50;

export interface CountdownOptions {
  /** Time advances only while true; false pauses and keeps the elapsed time. */
  running: boolean;
  /** Fires once when the time is up. */
  onDone: () => void;
  /** Called on each beat (e.g. a clock tick) with progress 0 → 1 and an alternating flag. */
  onBeat?: (progress: number, alt: boolean) => void;
  /** Milliseconds between beats at a given progress; beats are off without it. */
  beatGap?: (progress: number) => number;
}

export interface Countdown {
  elapsed: number;
  remaining: number;
  /** 0 → 1 */
  progress: number;
}

/**
 * Pausable countdown with optional beats that can speed up as time runs out.
 * Remount (via `key`) to restart. A duration of 0 never runs.
 */
export function useCountdown(
  durationMs: number,
  { running, onDone, onBeat, beatGap }: CountdownOptions,
): Countdown {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const lastBeat = useRef(-Infinity);
  const alt = useRef(false);
  const finish = useEffectEvent(onDone);
  const beat = useEffectEvent((progress: number) => {
    if (!onBeat || !beatGap) return;
    const now = performance.now();
    if (now - lastBeat.current < beatGap(progress)) return;
    lastBeat.current = now;
    alt.current = !alt.current;
    onBeat(progress, alt.current);
  });

  useEffect(() => {
    if (!running || durationMs <= 0 || elapsedRef.current >= durationMs) return;

    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      elapsedRef.current = Math.min(durationMs, elapsedRef.current + (now - last));
      last = now;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= durationMs) {
        window.clearInterval(id);
        finish();
      } else {
        beat(elapsedRef.current / durationMs);
      }
    }, FRAME_MS);

    return () => window.clearInterval(id);
  }, [running, durationMs]);

  const remaining = Math.max(0, durationMs - elapsed);
  return { elapsed, remaining, progress: durationMs > 0 ? Math.min(1, elapsed / durationMs) : 0 };
}
