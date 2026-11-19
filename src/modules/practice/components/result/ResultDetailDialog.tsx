import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, FileText, Languages, X } from "lucide-react";

import { mediaUrls, RichText } from "@/shared/components/RichText";
import { Button, IconButton } from "@/shared/components/ui";

import type { QuestionGroup } from "../../utils/attemptGroups";
import { part5BlankFill, passageHighlights } from "../../utils/passageMarks";
import { partMeta } from "../../utils/parts";
import { ExplanationPanel, OptionBubbles, QuestionHistoryTags } from "../common";
import type { ResultRow } from "./resultRows";
import styles from "./ResultDetailDialog.module.css";

export interface ResultDetailDialogProps {
  row: ResultRow;
  /** Review groups (null when the review content could not be loaded). */
  groups: readonly QuestionGroup[] | null;
  /** Position in the filtered list (for "i / n"). */
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

const STATUS_LABEL = { correct: "Đúng", wrong: "Sai", skip: "Bỏ qua" } as const;

const PROMPT: Record<number, string> = {
  1: "Chọn câu mô tả đúng nhất bức tranh.",
  2: "Chọn câu đáp lại phù hợp nhất.",
};

/**
 * "Chi tiết" of one graded question (port of StudyChill ResultDetailDialog): group audio with full
 * controls, image, transcript (open) and translation (collapsed), the options with the correct /
 * wrong marks, the explanation with vocabulary cards. Native <dialog>: focus trap, Escape,
 * Alt+← / Alt+→ for the previous / next question of the filtered list.
 */
export function ResultDetailDialog({
  row,
  groups,
  index,
  count,
  onPrev,
  onNext,
  onClose,
}: ResultDetailDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const group = row.groupIndex >= 0 && groups ? groups[row.groupIndex] : null;
  const question = group ? group.questions[row.questionIndex] : null;
  const listening = row.section === "listening";
  const meta = partMeta(row.part);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const before = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    }
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = overflow;
      if (dialog.open) dialog.close();
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, []);

  // Another question: back to the top of the body.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [row.questionId]);

  const images = useMemo(() => (group?.imageUrls ?? []).flatMap((url) => mediaUrls(url)), [group]);
  const audio = group?.audioUrl || null;
  const highlights = useMemo(
    () => (group && !listening ? passageHighlights(group.questions) : []),
    [group, listening],
  );
  const range =
    group && group.questions.length > 1 ? `Câu ${group.firstNumber}–${group.lastNumber}` : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (!event.altKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onNext();
    }
  };

  const reveal = { correctAnswer: row.correct, userAnswer: row.user };
  const options =
    question?.options ??
    (row.part === 2 ? ["A", "B", "C"] : ["A", "B", "C", "D"]).map((key) => ({
      key: key as ResultRow["correct"],
      text: "",
    }));
  const transcript = question?.reveal?.transcript ?? null;
  const transcriptTranslation = question?.reveal?.transcriptTranslation ?? null;
  const text = question?.text ?? "";

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="result-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className={styles.titles}>
            <span className={styles.kicker} data-section={row.section}>
              Part {row.part} · {meta.name}
            </span>
            <h2 id="result-detail-title" className={styles.title}>
              Câu {row.number}
              <span className={styles.badge} data-status={row.status}>
                {STATUS_LABEL[row.status]}
              </span>
            </h2>
          </div>
          <IconButton ref={closeRef} label="Đóng (Esc)" variant="outline" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>

        <div ref={bodyRef} className={styles.body}>
          {!group && (
            <p className={styles.hint}>
              Chưa mở được nội dung đề — chỉ xem được đáp án của câu này.
            </p>
          )}

          {group && (audio || images.length > 0 || group.content) && (
            <section className={styles.group} aria-label={range ?? `Câu ${row.number}`}>
              {range && <p className={styles.groupLabel}>{group.title || range}</p>}
              {audio && (
                // A new element per group: the previous one stops by itself.
                <audio key={group.id} className={styles.audio} src={audio} controls preload="none">
                  Trình duyệt không phát được audio.
                </audio>
              )}
              {images.length > 0 && (
                <div className={styles.images} data-multi={images.length > 1 || undefined}>
                  {images.map((src, i) => (
                    <img
                      key={src}
                      src={src}
                      alt={`Hình ${i + 1} của ${range ?? `câu ${row.number}`}`}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              )}
              {group.content &&
                (listening ? (
                  <details className={styles.fold} open>
                    <summary>
                      <FileText size={14} aria-hidden="true" /> Transcript (lời thoại)
                    </summary>
                    <RichText
                      value={group.content}
                      variant="transcript"
                      lang="en"
                      className={styles.foldBody}
                    />
                  </details>
                ) : (
                  <RichText
                    value={group.content}
                    variant="document"
                    lang="en"
                    highlights={highlights}
                    className={styles.passage}
                  />
                ))}
              {group.translation && (
                <details className={styles.fold}>
                  <summary>
                    <Languages size={14} aria-hidden="true" /> Bản dịch
                  </summary>
                  <RichText
                    value={group.translation}
                    variant="document"
                    lang="vi"
                    className={styles.foldBody}
                  />
                </details>
              )}
            </section>
          )}

          <section className={styles.question} aria-label={`Câu hỏi ${row.number}`}>
            <div className={styles.questionText}>
              <strong>{row.number}.</strong>{" "}
              {text ? (
                <RichText
                  value={text}
                  inline
                  lang="en"
                  dashBlanks={row.part === 5}
                  blankFill={
                    row.part === 5 && question ? part5BlankFill(question, null) : undefined
                  }
                />
              ) : (
                <span>{PROMPT[row.part] ?? ""}</span>
              )}
            </div>
            {transcript && !(listening && group?.content) && (
              <details className={styles.fold} open={row.part <= 2}>
                <summary>
                  <FileText size={14} aria-hidden="true" /> Transcript (lời thoại)
                </summary>
                <RichText
                  value={transcript}
                  variant="transcript"
                  lang="en"
                  className={styles.foldBody}
                />
              </details>
            )}
            {transcriptTranslation && (
              <details className={styles.fold}>
                <summary>
                  <Languages size={14} aria-hidden="true" /> Bản dịch lời thoại
                </summary>
                <RichText
                  value={transcriptTranslation}
                  variant="transcript"
                  lang="vi"
                  className={styles.foldBody}
                />
              </details>
            )}
            <OptionBubbles
              name={`detail-${row.questionId}`}
              options={options}
              selected={row.user}
              reveal={reveal}
              label={`Các lựa chọn câu ${row.number}`}
            />
            {row.status === "skip" && (
              <p className={styles.skipNote}>Bạn chưa chọn đáp án cho câu này.</p>
            )}
            {question?.reveal && question.reveal.history.length > 0 && (
              <QuestionHistoryTags history={question.reveal.history} />
            )}
          </section>

          {question?.reveal ? (
            <ExplanationPanel key={question.id} question={question} defaultOpen />
          ) : (
            group && <p className={styles.hint}>Câu này chưa có lời giải.</p>
          )}
        </div>

        <footer className={styles.foot}>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={index <= 0}
            icon={<ChevronLeft size={16} aria-hidden="true" />}
            title="Câu trước (Alt+←)"
          >
            Câu trước
          </Button>
          <span className={styles.position}>
            {index + 1} / {count}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={index >= count - 1}
            trailing={<ChevronRight size={16} aria-hidden="true" />}
            title="Câu sau (Alt+→)"
          >
            Câu sau
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
