import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

import { Badge, ButtonGlyph, NumberTile, ProgressBar } from "@/shared/components/ui";

import type { ProgressCounts } from "../types/vocabulary.types";
import {
  formatPercent,
  lessonStatus,
  padOrder,
  progressLabel,
  progressRatio,
} from "../utils/vocabulary-format";
import styles from "./LessonTile.module.css";

interface LessonTileProps {
  to: string;
  order: number;
  wordCount: number;
  previewWords: string[];
  lastWord: string;
  progress: ProgressCounts;
  /** Show the progress bar (signed-in learners). */
  showProgress?: boolean;
  /** The first unfinished lesson: filled with the stage tone (--tone-fill). */
  isNext?: boolean;
}

export function LessonTile({
  to,
  order,
  wordCount,
  previewWords,
  lastWord,
  progress,
  showProgress = true,
  isNext = false,
}: LessonTileProps) {
  const status = lessonStatus(progress);
  const state = isNext ? "next" : status === "done" ? "done" : "default";
  const ratio = progressRatio(progress);
  const first = previewWords[0];
  const done = status === "done";
  const chipTone = isNext ? "outline" : "neutral";

  return (
    <Link to={to} className={styles.tile} data-state={state}>
      <span className={styles.top}>
        <NumberTile label="Bài" value={padOrder(order)} size="lg" className={styles.number} />
        {isNext ? (
          <Badge tone="tone" size="md">
            Học tiếp
          </Badge>
        ) : done ? (
          <Badge tone="outline" size="md">
            Đã xong
          </Badge>
        ) : (
          <Badge tone="outline" size="md" className={styles.count}>
            {wordCount} từ
          </Badge>
        )}
      </span>

      <span className={styles.words}>
        {previewWords.slice(0, 3).map((word) => (
          <Badge key={word} tone={chipTone} title={word} className={styles.word}>
            {word}
          </Badge>
        ))}
      </span>

      {first && lastWord && (
        <span className={styles.range} lang="en">
          <span className={styles.rangeWord}>{first}</span>
          <ArrowRight size={12} />
          <span className={styles.rangeWord}>{lastWord}</span>
        </span>
      )}

      <span className={styles.foot}>
        {showProgress ? (
          <>
            <ProgressBar
              className={styles.bar}
              value={ratio}
              max={1}
              size="xs"
              tone={isNext ? "outline" : done ? "neutral" : "tone"}
              inverted={isNext}
              label={progressLabel(progress)}
            />
            <span className={styles.percent}>{formatPercent(ratio)}</span>
          </>
        ) : (
          <span className={styles.bar} />
        )}
        <ButtonGlyph
          round
          size="sm"
          variant={isNext ? "secondary" : done ? "outline" : "tone"}
          className={styles.play}
        >
          <Play size={14} />
        </ButtonGlyph>
      </span>
    </Link>
  );
}
