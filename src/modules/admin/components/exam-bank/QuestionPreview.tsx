import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { mediaUrls, RichText, type BlankLabel } from "@/shared/components/RichText";

import { examBankApi } from "../../api/exam-bank.api";
import type { Question } from "../../types/exam-bank.types";
import { BankStatus } from "./BankControls";
import { DIFFICULTY_LABELS, questionPrompt, STATUS_LABELS } from "./bank.constants";
import styles from "./ExamBrowser.module.css";

/** `shown` holds the media of the passage: a question often repeats it and must not render it twice. */
function Media({
  image,
  audio,
  shown = [],
}: {
  image?: string | null;
  audio?: string | null;
  shown?: string[];
}) {
  const images = mediaUrls(image).filter((url) => !shown.includes(url));
  const [track] = mediaUrls(audio).filter((url) => !shown.includes(url));
  return (
    <>
      {images.map((src, index) => (
        <img
          key={src}
          className={styles.questionImage}
          src={src}
          alt={
            images.length > 1
              ? `Hình ảnh của câu hỏi (${index + 1}/${images.length})`
              : "Hình ảnh của câu hỏi"
          }
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ))}
      {track && (
        <audio className={styles.audio} controls preload="none" src={track}>
          Trình duyệt không hỗ trợ âm thanh.
        </audio>
      )}
    </>
  );
}

function Translation({
  value,
  variant,
}: {
  value: string | null;
  variant: "document" | "transcript";
}) {
  if (!value) return null;
  return (
    <details className={styles.translation}>
      <summary>Bản dịch tiếng Việt</summary>
      <RichText value={value} variant={variant} lang="vi" />
    </details>
  );
}

const DEFAULT_PROMPTS: Record<number, string> = {
  1: "Look at the picture and select the best description.",
  2: "Listen and select the best answer.",
  3: "Listen and select the best answer.",
  4: "Listen and select the best answer.",
  5: "Select the best answer to complete the sentence.",
  6: "Select the best answer to complete the text.",
  7: "Read and select the best answer.",
};

/**
 * Blanks are numbered by the source: real question numbers ("____135____") in tests, or a local
 * index ("[13]") in the bank. Both are shown as the matching question of the passage.
 */
function useBlankLabels(questions: Question[] | undefined, currentId: string) {
  return useCallback(
    (sourceNumber: number, index: number): BlankLabel => {
      const match =
        questions?.find((item) => item.questionNumber === sourceNumber) ?? questions?.[index];
      if (!match) return { label: String(sourceNumber) };
      return {
        label: String(match.questionNumber ?? index + 1),
        active: match.id === currentId,
      };
    },
    [questions, currentId],
  );
}

export function QuestionPreview({
  id,
  part,
  onSelect,
}: {
  id: string;
  part: number;
  onSelect: (id: string) => void;
}) {
  const detail = useQuery({
    queryKey: ["exam-bank", "question", id],
    queryFn: ({ signal }) => examBankApi.question(id, signal),
    retry: false,
  });
  const passageId = detail.data?.passageId;
  const passage = useQuery({
    queryKey: ["exam-bank", "passage", passageId],
    queryFn: ({ signal }) => examBankApi.passage(passageId!, signal),
    enabled: Boolean(passageId),
    retry: false,
  });
  const blankLabel = useBlankLabels(passage.data?.questions, id);

  if (detail.isPending || detail.isError)
    return (
      <BankStatus
        loading={detail.isPending}
        error={detail.error}
        retry={() => void detail.refetch()}
      />
    );
  const q = detail.data;
  const source = passage.data;
  const listening = part <= 4;
  const transcript = q.transcript || source?.transcript;
  return (
    <article className={styles.preview}>
      <header className={styles.previewHeader}>
        <div>
          <span className={styles.eyebrow}>
            PART {part} / {listening ? "LISTENING" : "READING"}
          </span>
          <h2>Câu {q.questionNumber ?? "hỏi độc lập"}</h2>
        </div>
        <span className={styles.badge} data-status={q.status}>
          {STATUS_LABELS[q.status] ?? q.status}
        </span>
      </header>
      <div className={styles.meta}>
        <span>{DIFFICULTY_LABELS[q.difficultyLevel] ?? q.difficultyLevel}</span>
        <span>Mã: {q.id.slice(0, 8)}</span>
      </div>
      {passageId && (passage.isPending || passage.isError) && (
        <BankStatus
          loading={passage.isPending}
          error={passage.error}
          retry={() => void passage.refetch()}
        />
      )}
      {source && (
        <section className={styles.source} aria-label="Nội dung chung">
          <span className={styles.eyebrow}>
            {listening ? "NGỮ CẢNH BÀI NGHE" : "VĂN BẢN ĐỌC HIỂU"}
          </span>
          {source.title && (
            <h3>
              <RichText value={source.title} inline />
            </h3>
          )}
          <Media image={source.imageUrl} audio={source.audioUrl} />
          <RichText
            value={source.content}
            variant={listening ? "transcript" : "document"}
            blankLabel={blankLabel}
            lang="en"
          />
          <Translation
            value={source.contentTranslation}
            variant={listening ? "transcript" : "document"}
          />
          {source.questions.length > 1 && (
            <nav className={styles.related} aria-label="Câu hỏi cùng đoạn">
              {source.questions.map((item, index) => (
                <button
                  key={item.id}
                  aria-pressed={item.id === id}
                  onClick={() => onSelect(item.id)}
                >
                  Câu {item.questionNumber ?? index + 1}
                </button>
              ))}
            </nav>
          )}
        </section>
      )}
      <Media
        image={q.imageUrl}
        audio={q.audioUrl}
        shown={[...mediaUrls(source?.imageUrl), ...mediaUrls(source?.audioUrl)]}
      />
      {part === 1 && !q.imageUrl && !source?.imageUrl && (
        <p className={styles.notice}>Chưa có hình ảnh.</p>
      )}
      {listening && !q.audioUrl && !source?.audioUrl && !passage.isFetching && (
        <p className={styles.notice}>Chưa có tệp âm thanh.</p>
      )}
      <h3 className={styles.prompt} lang="en">
        <RichText
          value={questionPrompt(q.questionText) ?? DEFAULT_PROMPTS[part]}
          inline
          dashBlanks={part === 5 || part === 6}
        />
      </h3>
      <ol className={styles.options} lang="en">
        {[q.optionA, q.optionB, q.optionC, q.optionD].map(
          (option, index) =>
            option != null && (
              <li key={index}>
                <span>{String.fromCharCode(65 + index)}</span>
                <p>
                  <RichText value={option} inline />
                </p>
              </li>
            ),
        )}
      </ol>
      <details className={styles.disclosure}>
        <summary>Đáp án & lời giải</summary>
        <div>
          <strong className={styles.answer}>Đáp án đúng: {q.correctAnswer}</strong>
          {q.explanation ? (
            <RichText value={q.explanation} variant="explanation" lang="vi" />
          ) : (
            <p>Chưa có lời giải.</p>
          )}
        </div>
      </details>
      {listening && (
        <details className={styles.disclosure}>
          <summary>Bản chép lời</summary>
          <div>
            {transcript ? (
              <RichText value={transcript} variant="transcript" lang="en" />
            ) : (
              <p>Chưa có bản chép lời.</p>
            )}
            <Translation value={q.transcriptTranslation} variant="transcript" />
          </div>
        </details>
      )}
    </article>
  );
}
