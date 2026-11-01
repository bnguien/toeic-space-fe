import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { Button, Kbd } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";

import type { SchedulePreviewDto, SelfGrade, WordDto } from "../types/vocabulary.types";
import { speak, stopSpeaking } from "../utils/speech";
import { FlipCard } from "./FlipCard";
import styles from "./FlashcardCard.module.css";
import { GradeBar } from "./GradeBar";
import { WordView } from "./WordView";

interface FlashcardCardProps {
  word: WordDto;
  preview: SchedulePreviewDto;
  saving: boolean;
  onGrade: (grade: SelfGrade) => void;
  /** Speak the headword when the card appears. */
  autoPlay?: boolean;
  /** Extra control on the back side (e.g. the save toggle). */
  backExtra?: ReactNode;
}

/** Flashcard mode for one card; remount per card to reset the flip. */
export function FlashcardCard({
  word,
  preview,
  saving,
  onGrade,
  autoPlay = true,
  backExtra,
}: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped((value) => !value);

  useEffect(() => {
    if (!autoPlay) return;
    speak(word.headword, "en-US");
    return stopSpeaking;
  }, [word.headword, autoPlay]);

  useHotkeys((event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      flip();
    }
  });

  return (
    <div className={styles.card}>
      <FlipCard
        flipped={flipped}
        onFlip={flip}
        front={<WordView word={word} density="card" hideMeaning />}
        back={<WordView word={word} density="sheet" aside={backExtra} />}
      />
      <div className={styles.controls}>
        {flipped ? (
          <GradeBar preview={preview} onGrade={onGrade} disabled={saving} />
        ) : (
          <Button
            variant="primary"
            size="lg"
            block
            icon={<RefreshCw size={18} />}
            trailing={<Kbd inverted>Space</Kbd>}
            onClick={flip}
          >
            Lật thẻ
          </Button>
        )}
      </div>
    </div>
  );
}
