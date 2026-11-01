import { useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";

import { Badge, Kbd } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";

import type { QuizQuestionDto } from "../types/vocabulary.types";
import { speak } from "../utils/speech";
import { formatPartOfSpeech } from "../utils/vocabulary-format";
import styles from "./QuizCard.module.css";

type OptionState = "idle" | "correct" | "wrong" | "dim";

interface QuizCardProps {
  question: QuizQuestionDto;
  /** Called once with the first pick. */
  onAnswer: (correct: boolean) => void;
  disabled?: boolean;
  /** Shown once answered (e.g. the save toggle). */
  revealExtra?: ReactNode;
}

/** Meaning prompt with four headword options; remount per card. */
export function QuizCard({ question, onAnswer, disabled = false, revealExtra }: QuizCardProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const locked = picked !== null || disabled;

  const pick = (wordId: string) => {
    if (locked) return;
    setPicked(wordId);
    const answer = question.options.find((option) => option.wordId === question.wordId);
    if (answer) speak(answer.headword, "en-US");
    onAnswer(wordId === question.wordId);
  };

  useHotkeys((event) => {
    const index = Number(event.key) - 1;
    const option = question.options[index];
    if (option && index >= 0 && index < 4) {
      event.preventDefault();
      pick(option.wordId);
    }
  }, !locked);

  const stateOf = (wordId: string): OptionState => {
    if (picked === null) return "idle";
    if (wordId === question.wordId) return "correct";
    if (wordId === picked) return "wrong";
    return "dim";
  };

  return (
    <div className={styles.quiz}>
      <div className={styles.prompt}>
        <Badge tone="blue" size="md">
          {formatPartOfSpeech(question.partOfSpeech)}
        </Badge>
        <p className={styles.meaning}>{question.prompt}</p>
        {picked !== null && revealExtra}
      </div>

      <div className={styles.options} role="group" aria-label="Đáp án">
        {question.options.slice(0, 4).map((option, index) => {
          const state = stateOf(option.wordId);
          return (
            <button
              key={option.wordId}
              type="button"
              className={styles.option}
              data-state={state}
              disabled={locked}
              aria-pressed={picked === option.wordId}
              onClick={() => pick(option.wordId)}
            >
              <Kbd>{index + 1}</Kbd>
              <span className={styles.headword} lang="en">
                {option.headword}
              </span>
              {state === "correct" && <Check size={18} aria-label="Đúng" />}
              {state === "wrong" && <X size={18} aria-label="Sai" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
