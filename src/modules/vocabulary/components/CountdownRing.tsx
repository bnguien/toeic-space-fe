import type { CSSProperties } from "react";

import styles from "./CountdownRing.module.css";

interface CountdownRingProps {
  elapsed: number;
  duration: number;
  paused?: boolean;
}

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownRing({ elapsed, duration, paused = false }: CountdownRingProps) {
  const ratio = duration > 0 ? Math.min(1, elapsed / duration) : 1;
  const seconds = Math.max(0, Math.ceil((duration - elapsed) / 1000));

  return (
    <div
      className={styles.ring}
      data-paused={paused || undefined}
      data-ending={ratio >= 0.8 || undefined}
      role="timer"
      aria-label={`${seconds} giây`}
    >
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle className={styles.track} cx="24" cy="24" r={RADIUS} />
        <circle
          className={styles.value}
          cx="24"
          cy="24"
          r={RADIUS}
          style={
            {
              "--ring-length": `${CIRCUMFERENCE}`,
              "--ring-offset": `${CIRCUMFERENCE * ratio}`,
            } as CSSProperties
          }
        />
      </svg>
      <span className={styles.seconds}>{seconds}</span>
    </div>
  );
}
