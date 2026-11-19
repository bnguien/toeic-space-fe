import { useRef, type MouseEvent, type ReactNode } from "react";
import { Check, X } from "lucide-react";

import { RichText } from "@/shared/components/RichText";
import { cx } from "@/shared/components/ui";

import type { Answer, AnswerOption } from "../../types/practice-exam.types";
import type { GroupOption } from "../../utils/attemptGroups";
import styles from "./OptionBubbles.module.css";

export interface OptionBubblesProps {
  /** Radio group name (the question id). */
  name: string;
  options: readonly GroupOption[];
  selected: AnswerOption | null;
  /** Omit for a read-only list. Receives null when a double-click restores "no answer". */
  onSelect?: (answer: Answer) => void;
  disabled?: boolean;
  /** Exam Parts 1–2 (and practice before the check): letters only, the audio is the content. */
  lettersOnly?: boolean;
  /** Once revealed: correct option green, wrong choice red, others muted. */
  reveal?: { correctAnswer: AnswerOption; userAnswer: AnswerOption | null } | null;
  /** Accessible name of the group, e.g. "Câu 12". */
  label?: string;
  /** Extra content under an option after the reveal (speak button, translation…). */
  renderExtra?: (option: GroupOption) => ReactNode;
  /** Large touch targets (exam room). */
  size?: "md" | "lg";
  /**
   * A double-click (selecting a word to look it up) gives back the previous answer. Turn off where
   * lookup is disabled (exam room), so a fast double-click simply keeps the choice.
   */
  restoreOnDoubleClick?: boolean;
  className?: string;
}

const DOUBLE_CLICK_MS = 450;

/**
 * A–D answer bubbles (port of StudyChill OptionWithTranslation / ExamQuestionCard options).
 * Native radios for keyboard and screen readers. A drag-selection is not a choice, and a
 * double-click (selecting a word to look it up) gives back the previous answer.
 */
export function OptionBubbles({
  name,
  options,
  selected,
  onSelect,
  disabled = false,
  lettersOnly = false,
  reveal = null,
  label,
  renderExtra,
  size = "md",
  restoreOnDoubleClick = true,
  className,
}: OptionBubblesProps) {
  const lastClick = useRef<{ at: number; previous: Answer } | null>(null);
  const interactive = Boolean(onSelect) && !disabled && !reveal;

  const choose = (event: MouseEvent<HTMLLabelElement>) => {
    if (!interactive || !onSelect) return;
    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed && event.detail < 2) {
      // Dragging over the text to select it is not a choice.
      event.preventDefault();
      return;
    }
    if (event.detail >= 2 && restoreOnDoubleClick) {
      event.preventDefault();
      const memory = lastClick.current;
      if (memory && Date.now() - memory.at < DOUBLE_CLICK_MS) onSelect(memory.previous);
      lastClick.current = null;
      return;
    }
    lastClick.current = { at: Date.now(), previous: selected };
  };

  return (
    <div
      role="radiogroup"
      aria-label={label ?? "Các lựa chọn trả lời"}
      aria-disabled={!interactive || undefined}
      className={cx(styles.options, className)}
      data-size={size}
      data-letters={lettersOnly || undefined}
      data-revealed={reveal ? true : undefined}
    >
      {options.map((option) => {
        const isSelected = selected === option.key;
        const correct = reveal?.correctAnswer === option.key;
        const wrong = Boolean(reveal && reveal.userAnswer === option.key && !correct);
        const mine = reveal ? reveal.userAnswer === option.key : isSelected;
        const showText = !lettersOnly && option.text.trim() !== "";
        return (
          <label
            key={option.key}
            className={styles.option}
            data-selected={isSelected || undefined}
            data-correct={correct || undefined}
            data-wrong={wrong || undefined}
            data-mine={mine || undefined}
            data-disabled={!interactive || undefined}
            onClick={choose}
          >
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option.key}
              checked={isSelected}
              disabled={!interactive}
              onChange={() => onSelect?.(option.key)}
            />
            <span className={styles.bubble} aria-hidden="true">
              {option.key}
            </span>
            <span className={styles.body}>
              {showText ? (
                <RichText value={option.text} inline lang="en" className={styles.text} />
              ) : (
                <span className={styles.srOnly}>Đáp án {option.key}</span>
              )}
              {reveal && (correct || wrong) && (
                <span className={styles.verdict} data-tone={correct ? "correct" : "wrong"}>
                  {correct ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <X size={14} aria-hidden="true" />
                  )}
                  {correct ? "Đáp án đúng" : "Bạn chọn"}
                </span>
              )}
              {reveal && renderExtra?.(option)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
