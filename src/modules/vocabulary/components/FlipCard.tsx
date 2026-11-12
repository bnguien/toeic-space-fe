import type { ReactNode } from "react";

import styles from "./FlipCard.module.css";

interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
  onFlip: () => void;
}

/** Two-sided 3D container filling its parent; clicking flips it (inner buttons stop propagation). */
export function FlipCard({ front, back, flipped, onFlip }: FlipCardProps) {
  return (
    <div className={styles.scene} data-flipped={flipped || undefined} onClick={onFlip}>
      <div className={styles.inner}>
        <div className={styles.face} inert={flipped}>
          {front}
        </div>
        <div className={`${styles.face} ${styles.back}`} inert={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}
