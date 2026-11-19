import type { CSSProperties } from "react";

import { Badge } from "../ui";
import {
  CONTENT_STATUS_TONES,
  DIFFICULTY_LABELS,
  DIFFICULTY_TONES,
  STATUS_LABELS,
} from "./bank.constants";
import styles from "./bank.module.css";

export function ContentStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={CONTENT_STATUS_TONES[status]} dot>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function DifficultyBadge({ level }: { level: string }) {
  return <Badge tone={DIFFICULTY_TONES[level]}>{DIFFICULTY_LABELS[level] ?? level}</Badge>;
}

/** Listening / Reading split of an exam as a thin two-colour bar. */
export function SectionSplit({ listening, reading }: { listening: number; reading: number }) {
  const total = listening + reading;
  return (
    <span className={styles.split} title={`Listening ${listening} · Reading ${reading}`}>
      <span
        className={styles.splitTrack}
        style={{ "--listening": `${total ? (listening / total) * 100 : 50}%` } as CSSProperties}
      />
      <small>
        LC {listening} · RC {reading}
      </small>
    </span>
  );
}
