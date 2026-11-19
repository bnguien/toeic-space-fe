import { memo } from "react";

import { RichText } from "@/shared/components/RichText";

import type { Answer, AnswerOption } from "../../types/practice-exam.types";
import type { GroupQuestion } from "../../utils/attemptGroups";
import { part5BlankFill } from "../../utils/passageMarks";
import { FlagButton, OptionBubbles } from "../common";
import styles from "./ExamScreens.module.css";

export interface ExamQuestionCardProps {
  question: GroupQuestion;
  answer: AnswerOption | null;
  flagged: boolean;
  /** The flag could not be saved (dashed button). */
  flagFailed?: boolean;
  onAnswer: (questionId: string, answer: Answer) => void;
  onFlag: (questionId: string) => void;
  /** Parts 1–2: letters only, like the real answer sheet. */
  lettersOnly?: boolean;
  /** Part 5: the blank shows the chosen option. */
  fillBlank?: boolean;
  /** Line above the options, e.g. "Mark your answer." (Part 2). */
  prompt?: string;
  onFocusQuestion?: (questionId: string) => void;
}

/**
 * One exam question (port of StudyChill ExamQuestionCard): number, "Đánh dấu xem lại" flag,
 * prompt / text (Part 5 blank filled with the chosen option) and A–D bubbles. Answers stay
 * changeable while the screen is shown.
 */
export const ExamQuestionCard = memo(function ExamQuestionCard({
  question,
  answer,
  flagged,
  flagFailed = false,
  onAnswer,
  onFlag,
  lettersOnly = false,
  fillBlank = false,
  prompt,
  onFocusQuestion,
}: ExamQuestionCardProps) {
  const filled = fillBlank ? part5BlankFill(question, answer) : "";
  return (
    <article
      id={`exam-q-${question.id}`}
      className={styles.question}
      data-letters={lettersOnly || undefined}
      aria-label={`Câu ${question.number}`}
      onFocusCapture={() => onFocusQuestion?.(question.id)}
      onPointerDownCapture={() => onFocusQuestion?.(question.id)}
    >
      <header className={styles.questionHead}>
        <span className={styles.questionNumber}>{question.number}</span>
        <FlagButton flagged={flagged} failed={flagFailed} onToggle={() => onFlag(question.id)} />
      </header>
      {prompt && (
        <p className={styles.prompt} lang="en">
          {prompt}
        </p>
      )}
      {!lettersOnly && question.text && (
        <RichText
          value={question.text}
          variant="text"
          lang="en"
          className={styles.questionText}
          dashBlanks={fillBlank}
          blankFill={fillBlank ? filled : undefined}
        />
      )}
      <OptionBubbles
        name={question.id}
        options={question.options}
        selected={answer}
        onSelect={(value) => onAnswer(question.id, value)}
        lettersOnly={lettersOnly}
        label={`Câu ${question.number}`}
        size="lg"
        restoreOnDoubleClick={false}
        className={lettersOnly ? styles.letterOptions : undefined}
      />
    </article>
  );
});
