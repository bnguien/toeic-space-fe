import type { CSSProperties } from "react";
import { BookOpen, Headphones, Play } from "lucide-react";

import { Button } from "@/shared/components/ui";

import { useListeningFlow } from "../../hooks/useListeningFlow";
import type { ToeicSection } from "../../types/practice-exam.types";
import {
  DIRECTIONS,
  DIRECTIONS_FALLBACK_SECONDS,
  PART1_SAMPLE,
  directionsAudio,
} from "../../utils/directions";
import type { DirectionsKey } from "../../utils/examSteps";
import styles from "./ExamScreens.module.css";

export interface ExamDirectionsProps {
  dirKey: DirectionsKey;
  section: ToeicSection;
  onContinue: () => void;
}

/**
 * Listening directions are read aloud and move on by themselves (not skippable); without a
 * recording they count down 10 s. Mount with `key` = step so each screen starts fresh.
 */
function ListeningDirections({
  dirKey,
  onContinue,
}: Pick<ExamDirectionsProps, "dirKey" | "onContinue">) {
  const flow = useListeningFlow({
    src: directionsAudio(dirKey),
    afterSeconds: 0,
    errorSeconds: DIRECTIONS_FALLBACK_SECONDS,
    onDone: onContinue,
  });
  return (
    <div className={styles.dirStatus} aria-live="polite">
      {flow.status === "blocked" && (
        <Button variant="primary" icon={<Play size={16} aria-hidden="true" />} onClick={flow.play}>
          Phát
        </Button>
      )}
      {(flow.status === "loading" || flow.status === "playing") && (
        <div className={styles.meter}>
          <Headphones size={16} aria-hidden="true" />
          <span>Đang đọc hướng dẫn…</span>
          <span
            className={styles.track}
            role="progressbar"
            aria-label="Tiến độ hướng dẫn"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(flow.progress * 100)}
          >
            <i style={{ width: `${Math.round(flow.progress * 100)}%` }} />
          </span>
        </div>
      )}
      {flow.status === "error" && (
        <div className={styles.meter}>
          <span>Tự chuyển sau {flow.windowLeft ?? DIRECTIONS_FALLBACK_SECONDS} giây</span>
          <span className={styles.track} data-countdown aria-hidden="true">
            <i style={{ "--count-duration": `${DIRECTIONS_FALLBACK_SECONDS}s` } as CSSProperties} />
          </span>
        </div>
      )}
    </div>
  );
}

/** Directions screen (port of StudyChill ExamDirections): ETS text, Part 1 sample, audio / button. */
export function ExamDirections({ dirKey, section, onContinue }: ExamDirectionsProps) {
  const text = DIRECTIONS[dirKey];
  const listening = section === "listening";
  return (
    <div className={styles.directions}>
      <section className={styles.dirCard} aria-labelledby="exam-directions-title">
        <span className={styles.kicker} data-section={section}>
          {listening ? (
            <Headphones size={15} aria-hidden="true" />
          ) : (
            <BookOpen size={15} aria-hidden="true" />
          )}
          {listening ? "Listening" : "Reading"} · Directions
        </span>
        <h2 id="exam-directions-title" className={styles.dirTitle}>
          {text.title}
        </h2>
        <p className={styles.dirText} lang="en">
          {text.text}
        </p>
        {dirKey === 1 && (
          <div className={styles.sample}>
            <strong>Sample</strong>
            <p lang="en">{PART1_SAMPLE.text}</p>
            <p className={styles.sampleNote}>{PART1_SAMPLE.note}</p>
          </div>
        )}
        {listening ? (
          <ListeningDirections dirKey={dirKey} onContinue={onContinue} />
        ) : (
          <div className={styles.dirStatus}>
            <Button variant="primary" size="lg" onClick={onContinue} autoFocus>
              Bắt đầu Part {dirKey}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
