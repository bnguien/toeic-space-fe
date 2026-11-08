import type { CSSProperties } from "react";

import styles from "./CountdownRing.module.css";

interface CountdownRingProps {
  /** Milliseconds left. */
  remaining: number;
  /** 0 → 1 */
  progress: number;
  paused?: boolean;
  /** Turns to the warning colour (e.g. the last 45%). */
  ending?: boolean;
}

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Seconds left inside a draining ring; reads the card colours. */
export function CountdownRing({
  remaining,
  progress,
  paused = false,
  ending = false,
}: CountdownRingProps) {
  const seconds = Math.max(0, Math.ceil(remaining / 1000));

  return (
    <div
      className={styles.ring}
      data-paused={paused || undefined}
      data-ending={ending || undefined}
      role="timer"
      aria-label={`${seconds} giây`}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle className={styles.track} cx="30" cy="30" r={RADIUS} />
        <circle
          className={styles.value}
          cx="30"
          cy="30"
          r={RADIUS}
          style={
            {
              "--ring-length": `${CIRCUMFERENCE}`,
              "--ring-offset": `${CIRCUMFERENCE * Math.min(1, Math.max(0, progress))}`,
            } as CSSProperties
          }
        />
      </svg>
      <span className={styles.seconds}>{seconds}</span>
    </div>
  );
}
