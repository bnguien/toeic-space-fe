import { memo } from "react";
import { CheckCircle2, Clock, CornerDownRight, TriangleAlert, XCircle } from "lucide-react";

import { AudioButton } from "@/modules/vocabulary";
import { RichText, toPlainText } from "@/shared/components/RichText";
import { cx } from "@/shared/components/ui";

import type { Answer, AnswerOption } from "../../types/practice-exam.types";
import type { GroupQuestion } from "../../utils/attemptGroups";
import type { AnswerState } from "../../utils/attemptAutosave";
import { part5BlankFill } from "../../utils/passageMarks";
import { ExplanationPanel, FlagButton, OptionBubbles, QuestionHistoryTags } from "../common";
import {
  isBlankPointer,
  resultLine,
  revealedOptions,
  stripSpeakerTags,
  type RevealedOption,
} from "./workspaceModel";
import styles from "./QuestionCard.module.css";

export interface QuestionCardProps {
  question: GroupQuestion;
  /** The learner's current (optimistic) choice. */
  selected: AnswerOption | null;
  flagged: boolean;
  /** Save state of the answer and the flag. */
  saveState?: AnswerState;
  /** Answers can change (in-progress practice, not checked). */
  editable: boolean;
  /** Flags can change (in-progress practice). */
  flaggable: boolean;
  /** The group is being checked with the server. */
  checking: boolean;
  /** The last check of this group failed. */
  checkFailed: boolean;
  /** Open the explanation by default (single-question group). */
  explanationOpen: boolean;
  compact: boolean;
  onSelect: (questionId: string, answer: Answer) => void;
  onToggleFlag: (questionId: string) => void;
  onRetryCheck: () => void;
  onRetrySave: (questionId: string) => void;
  onResolveConflict: (questionId: string, keepLocal: boolean) => void;
  onFocusQuestion: (questionId: string) => void;
}

/**
 * One question of the right panel (port of the StudyChill `tp-question-single-card`): number and
 * prompt (hidden for Parts 1–2 until checked), flag, A–D bubbles, then after the check the
 * result line, the listening script with translation (P1/P2), the per-question history and the
 * explanation accordion.
 */
export const QuestionCard = memo(function QuestionCard({
  question,
  selected,
  flagged,
  saveState,
  editable,
  flaggable,
  checking,
  checkFailed,
  explanationOpen,
  compact,
  onSelect,
  onToggleFlag,
  onRetryCheck,
  onRetrySave,
  onResolveConflict,
  onFocusQuestion,
}: QuestionCardProps) {
  const reveal = question.reveal;
  const listening = question.part <= 2;
  const options: readonly RevealedOption[] = reveal
    ? revealedOptions(question)
    : question.options.map((o) => ({ ...o, vi: "" }));
  const result = reveal ? resultLine(question) : null;
  const transcript = reveal?.transcript ? stripSpeakerTags(toPlainText(reveal.transcript)) : "";

  return (
    <article
      id={`q-${question.id}`}
      className={styles.card}
      data-revealed={reveal ? true : undefined}
      data-section={question.part <= 4 ? "listening" : "reading"}
      onFocusCapture={() => onFocusQuestion(question.id)}
      onPointerDown={() => onFocusQuestion(question.id)}
    >
      <header className={styles.head}>
        <p className={styles.title}>
          <strong>{question.number}.</strong>
          {!listening &&
            (question.part === 6 && isBlankPointer(question.text) ? (
              <span className={styles.blank}> [Chỗ trống {question.number}]</span>
            ) : question.text ? (
              <>
                {" "}
                <RichText
                  value={question.text}
                  inline
                  lang="en"
                  dashBlanks
                  // Phones drop the Part 5 sentence card: fill the blank here instead.
                  blankFill={
                    compact && question.part === 5 ? part5BlankFill(question, selected) : undefined
                  }
                />
              </>
            ) : null)}
          {listening && !reveal && (
            <span className={styles.hint}>
              {question.part === 1
                ? " Chọn câu mô tả đúng nhất bức tranh."
                : " Chọn câu đáp lại phù hợp nhất."}
            </span>
          )}
        </p>
        <FlagButton
          flagged={flagged}
          onToggle={() => onToggleFlag(question.id)}
          disabled={!flaggable}
          compact={compact}
          failed={saveState?.flagStatus === "error"}
        />
      </header>

      {reveal && listening && transcript && (
        <div className={styles.listening}>
          <p className={styles.listeningLabel}>Lời thoại</p>
          <p lang="en" className={styles.listeningText}>
            {transcript}
          </p>
          {reveal.transcriptTranslation && (
            <p className={styles.listeningVi}>
              <CornerDownRight size={13} aria-hidden="true" />
              {stripSpeakerTags(toPlainText(reveal.transcriptTranslation))}
            </p>
          )}
        </div>
      )}

      <OptionBubbles
        name={question.id}
        label={`Câu ${question.number}`}
        options={options}
        selected={reveal ? reveal.userAnswer : selected}
        onSelect={editable ? (answer) => onSelect(question.id, answer) : undefined}
        disabled={!editable}
        lettersOnly={listening && !reveal}
        reveal={
          reveal ? { correctAnswer: reveal.correctAnswer, userAnswer: reveal.userAnswer } : null
        }
        renderExtra={(option) => <OptionExtra option={option as RevealedOption} />}
      />

      {saveState?.status === "error" && (
        <p className={styles.save} role="alert">
          <TriangleAlert size={14} aria-hidden="true" />
          Chưa lưu được đáp án.
          <button type="button" onClick={() => onRetrySave(question.id)}>
            Thử lại
          </button>
        </p>
      )}
      {saveState?.status === "conflict" && (
        <p className={styles.save} role="alert">
          <TriangleAlert size={14} aria-hidden="true" />
          Đáp án vừa đổi ở phiên khác ({saveState.server?.answer ?? "—"}).
          <button type="button" onClick={() => onResolveConflict(question.id, true)}>
            Giữ đáp án của tôi
          </button>
          <button type="button" onClick={() => onResolveConflict(question.id, false)}>
            Dùng bản đã lưu
          </button>
        </p>
      )}

      {!reveal && checking && (
        <p className={cx(styles.result, styles.pending)} role="status">
          <Clock size={14} aria-hidden="true" />
          Đang chấm với máy chủ…
        </p>
      )}
      {!reveal && !checking && checkFailed && (
        <p className={cx(styles.result, styles.pending)} role="alert">
          <Clock size={14} aria-hidden="true" />
          Chưa lấy được đáp án.
          <button type="button" className={styles.retry} onClick={onRetryCheck}>
            Thử lại
          </button>
        </p>
      )}
      {result && (
        <p className={styles.result} data-tone={result.tone} role="status">
          {result.tone === "correct" ? (
            <CheckCircle2 size={15} aria-hidden="true" />
          ) : (
            <XCircle size={15} aria-hidden="true" />
          )}
          {result.text}
        </p>
      )}

      {reveal && <QuestionHistoryTags history={reveal.history} />}
      {reveal && <ExplanationPanel question={question} defaultOpen={explanationOpen} />}
    </article>
  );
});

/** Speak button and the Vietnamese line under a revealed option. */
function OptionExtra({ option }: { option: RevealedOption }) {
  const text = toPlainText(option.text).trim();
  if (!text && !option.vi) return null;
  return (
    <span className={styles.extra}>
      {text && <AudioButton text={text} size="sm" label={`Nghe phương án ${option.key}`} />}
      {option.vi && (
        <span className={styles.vi}>
          <CornerDownRight size={12} aria-hidden="true" />
          {option.vi}
        </span>
      )}
    </span>
  );
}
