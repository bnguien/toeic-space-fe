import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

import { Button } from "@/shared/components/ui";

import type { Answer, AnswerOption } from "../../types/practice-exam.types";
import type { GroupQuestion, QuestionGroup } from "../../utils/attemptGroups";
import { PassageView } from "../common";
import { ExamQuestionCard } from "./ExamQuestionCard";
import { activatesOnEnter, ownsKeys } from "./examRoomState";
import styles from "./ExamScreens.module.css";

export interface ExamReadingScreenProps {
  group: QuestionGroup;
  /** Questions of this screen (one for a split Part 5 group). */
  questions: readonly GroupQuestion[];
  answerOf: (questionId: string) => AnswerOption | null;
  isFlagged: (questionId: string) => boolean;
  flagFailed: (questionId: string) => boolean;
  onAnswer: (questionId: string, answer: Answer) => void;
  onFlag: (questionId: string) => void;
  onBack: () => void;
  onNext: () => void;
  canBack: boolean;
  /** Last screen: "Nộp bài" instead of "Tiếp". */
  isLast: boolean;
  total: number;
  keysEnabled: boolean;
  /** Phones: open on the questions tab (after a jump from the question grid). */
  initialTab?: "passage" | "questions";
}

const rangeOf = (questions: readonly GroupQuestion[]) => {
  const first = questions[0]?.number;
  const last = questions[questions.length - 1]?.number;
  return first === last ? `Câu ${first}` : `Câu ${first}–${last}`;
};

/**
 * Reading screen (port of StudyChill ExamReadingScreen): Part 5 one sentence; Parts 6–7 split
 * passage (left, own scroll) / questions (right); phones get "Bài đọc" / "Câu hỏi (x/n)" tabs.
 * Free navigation with Trước / Tiếp, → / Enter and ←. Mount with `key` = step.
 */
export function ExamReadingScreen({
  group,
  questions,
  answerOf,
  isFlagged,
  flagFailed,
  onAnswer,
  onFlag,
  onBack,
  onNext,
  canBack,
  isLast,
  total,
  keysEnabled,
  initialTab = "passage",
}: ExamReadingScreenProps) {
  const [tab, setTab] = useState(initialTab);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const split = group.isPassage && (group.part === 6 || group.part === 7);
  const range = rangeOf(questions);

  useEffect(() => {
    if (!keysEnabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (ownsKeys(event.target)) return;
      if (event.key === "Enter") {
        if (event.repeat || activatesOnEnter(event.target)) return;
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowRight") {
        // Also stops a focused radio from moving the answer.
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (canBack) onBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysEnabled, onNext, onBack, canBack]);

  const cards = (
    <div className={styles.readQuestions}>
      {questions.map((q) => (
        <ExamQuestionCard
          key={q.id}
          question={q}
          answer={answerOf(q.id)}
          flagged={isFlagged(q.id)}
          flagFailed={flagFailed(q.id)}
          onAnswer={onAnswer}
          onFlag={onFlag}
          fillBlank={group.part === 5}
          onFocusQuestion={setActiveId}
        />
      ))}
    </div>
  );
  const answered = questions.filter((q) => answerOf(q.id) !== null).length;

  return (
    <div className={styles.screen}>
      {split ? (
        <div className={styles.split} data-tab={tab}>
          <div className={styles.tabs} role="tablist" aria-label="Bài đọc / Câu hỏi">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "passage"}
              data-active={tab === "passage" || undefined}
              onClick={() => setTab("passage")}
            >
              Bài đọc
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "questions"}
              data-active={tab === "questions" || undefined}
              onClick={() => setTab("questions")}
            >
              Câu hỏi ({answered}/{questions.length})
            </button>
          </div>
          <section className={styles.panePassage} aria-label="Bài đọc">
            <PassageView group={group} examMode currentQuestionId={activeId} />
          </section>
          <section className={styles.paneQuestions} aria-label="Câu hỏi">
            <p className={styles.groupLabel} data-section="reading">
              Part {group.part} · {range}
            </p>
            {cards}
          </section>
        </div>
      ) : (
        <div className={styles.scroll}>
          <div className={styles.single}>
            <p className={styles.groupLabel} data-section="reading">
              Part {group.part} · {range}
            </p>
            {group.isPassage && (
              <PassageView group={group} examMode className={styles.singlePassage} />
            )}
            {cards}
          </div>
        </div>
      )}
      <footer className={styles.footer}>
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={!canBack}
          icon={<ChevronLeft size={16} aria-hidden="true" />}
        >
          Trước
        </Button>
        <span className={styles.footerPosition}>
          {range} / {total}
        </span>
        <Button
          variant={isLast ? "ink" : "primary"}
          onClick={onNext}
          trailing={
            isLast ? (
              <Send size={15} aria-hidden="true" />
            ) : (
              <ChevronRight size={16} aria-hidden="true" />
            )
          }
        >
          {isLast ? "Nộp bài" : "Tiếp"}
        </Button>
      </footer>
    </div>
  );
}
