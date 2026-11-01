import { useEffect, useEffectEvent, useRef, useState } from "react";

const TICK_MS = 100;

/**
 * Pausable countdown. `elapsed` grows only while `running`; `onDone` fires once at the end.
 * Remount (via `key`) to restart.
 */
export function useCountdown(durationMs: number, running: boolean, onDone: () => void) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    if (!running || elapsedRef.current >= durationMs) return;

    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      elapsedRef.current = Math.min(durationMs, elapsedRef.current + (now - last));
      last = now;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= durationMs) {
        window.clearInterval(id);
        finish();
      }
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [running, durationMs]);

  return elapsed;
}
