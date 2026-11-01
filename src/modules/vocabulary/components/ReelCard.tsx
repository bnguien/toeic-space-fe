import type { ReactNode } from "react";

import type { ReelBackgroundDto, ReviewGrade, WordDto } from "../types/vocabulary.types";
import { ReelBackdrop } from "./ReelBackdrop";
import styles from "./ReelCard.module.css";
import { ReelRound } from "./ReelRound";

interface ReelCardProps {
  word: WordDto;
  /** Unique per attempt; restarts the round. */
  cardKey: string;
  backgrounds: ReelBackgroundDto[];
  backgroundIndex: number;
  onAnswer: (grade: ReviewGrade) => void;
  revealExtra?: ReactNode;
}

/** Reel frame: the background persists across cards and cross-fades, the round restarts. */
export function ReelCard({
  word,
  cardKey,
  backgrounds,
  backgroundIndex,
  onAnswer,
  revealExtra,
}: ReelCardProps) {
  return (
    <div className={styles.frame}>
      <ReelBackdrop backgrounds={backgrounds} index={backgroundIndex} />
      <ReelRound key={cardKey} word={word} onAnswer={onAnswer} revealExtra={revealExtra} />
    </div>
  );
}
