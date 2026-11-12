import { useQuery } from "@tanstack/react-query";

import { mediaUrls, RichText } from "@/shared/components/RichText";
import {
  QuestionOptions,
  ListeningTranscript,
  QuestionExplanation,
  availableTranslations,
  listeningScripts,
  blankLabels,
  QuestionMedia,
} from "@/shared/components/QuestionContent";

import { examBankApi } from "../../api/exam-bank.api";
import { BankStatus } from "./BankControls";
import { DIFFICULTY_LABELS, questionPrompt, STATUS_LABELS } from "./bank.constants";
import styles from "./ExamBrowser.module.css";

function Media(props: Parameters<typeof QuestionMedia>[0]) {
  return (
    <QuestionMedia
      {...props}
      imageClassName={styles.questionImage}
      audioClassName={styles.audio}
      firstAudioOnly
    />
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
  const sourceQuestions = passage.data?.questions ?? [];
  const blankLabel = blankLabels(
    sourceQuestions,
    new Map(sourceQuestions.map((q, index) => [q.id, String(q.questionNumber ?? index + 1)])),
    id,
    true,
  );

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
  const groupAudio = source?.audioUrl || q.audioUrl;
  const sourceAudio = mediaUrls(groupAudio);
  const separateAudio = mediaUrls(q.audioUrl).some((url) => !sourceAudio.includes(url));
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
        <section className={styles.source} aria-label="Đề bài">
          <span className={styles.eyebrow}>
            {listening ? "NGỮ CẢNH BÀI NGHE" : "VĂN BẢN ĐỌC HIỂU"}
          </span>
          {source.title && (
            <h3>
              <RichText value={source.title} inline />
            </h3>
          )}
          <Media image={source.imageUrl} audio={groupAudio} />
          {listening ? (
            <ListeningTranscript
              key={passageId}
              part={part}
              scripts={listeningScripts(separateAudio ? {} : q, source)}
            />
          ) : (
            <RichText value={source.content} variant="document" blankLabel={blankLabel} lang="en" />
          )}
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
        shown={source ? [...mediaUrls(source.imageUrl), ...sourceAudio] : []}
      />
      {listening && (!source || separateAudio) && (
        <ListeningTranscript key={id} part={part} scripts={[q.transcript]} />
      )}
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
      <QuestionOptions
        part={part}
        optionA={q.optionA}
        optionB={q.optionB}
        optionC={q.optionC}
        optionD={q.optionD}
        variant="cards"
      />
      <QuestionExplanation
        explanation={q.explanation}
        correctAnswer={q.correctAnswer}
        translations={availableTranslations(q, source)}
      />
    </article>
  );
}
