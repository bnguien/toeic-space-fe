import { mediaUrls, RichText } from "@/shared/components/RichText";
import {
  QuestionOptions,
  ListeningTranscript,
  QuestionExplanation,
  availableTranslations,
  blankLabels,
  QuestionMedia,
} from "@/shared/components/QuestionContent";
import type { PracticeSetContent, PracticeSetDetail } from "../api/practice-sets.api";
import { orderedContent } from "../utils/orderedContent";
import styles from "./Practice.module.css";

type PartContent = PracticeSetContent["parts"][number];
type QuestionContent = PartContent["standaloneQuestions"][number];
function Media(props: Parameters<typeof QuestionMedia>[0]) {
  return <QuestionMedia {...props} imageClassName={styles.image} imageAlt="Hình ảnh đề bài" />;
}
function Question({
  question,
  number,
  shown,
  passage,
  showTranscript,
}: {
  question: QuestionContent;
  number: number;
  shown: string[];
  passage?: PartContent["passages"][number];
  showTranscript: boolean;
}) {
  const part = Number(question.part.replace("Part", ""));
  return (
    <section className={styles.question} aria-label={`Câu ${number}`}>
      <h3>Câu {number}</h3>
      <Media image={question.imageUrl} audio={question.audioUrl} shown={shown} />
      {showTranscript && <ListeningTranscript part={part} scripts={[question.transcript]} />}
      <RichText value={question.questionText} dashBlanks />
      <QuestionOptions
        part={part}
        optionA={question.optionA}
        optionB={question.optionB}
        optionC={question.optionC}
        optionD={question.optionD}
      />
      <QuestionExplanation
        explanation={question.explanation}
        correctAnswer={question.correctAnswer}
        translations={availableTranslations(question, passage)}
      />
    </section>
  );
}
export function PracticeContent({
  content,
  items,
}: {
  content: PracticeSetContent;
  items: PracticeSetDetail["items"];
}) {
  const questions = new Map<string, QuestionContent>();
  const passages = new Map<string, PartContent["passages"][number]>();
  content.parts.forEach((part) => {
    part.standaloneQuestions.forEach((q) => questions.set(q.id, q));
    part.passages.forEach((p) => {
      passages.set(p.id, p);
      p.questions.forEach((q) => questions.set(q.id, q));
    });
  });
  // Use the ordered-items contract: grouping by passage must never change the requested order.
  const labels = new Map(items.map((item, index) => [item.questionId, String(index + 1)]));
  return (
    <div className={styles.stack}>
      {orderedContent(items, questions).map(({ questionId, question, number, firstInPassage }) => {
        if (!question)
          return (
            <p key={questionId} role="alert">
              Câu {number}: Không tải được nội dung câu hỏi.
            </p>
          );
        const passage = question.passageId ? passages.get(question.passageId) : undefined;
        const first = passage && firstInPassage;
        const part = Number(question.part.replace("Part", ""));
        const groupAudio =
          passage?.audioUrl || passage?.questions.find((q) => q.audioUrl)?.audioUrl;
        const sharedMedia = [...mediaUrls(passage?.imageUrl), ...mediaUrls(groupAudio)];
        const hasSeparateAudio = mediaUrls(question.audioUrl).some(
          (url) => !sharedMedia.includes(url),
        );
        return (
          <article key={questionId} className={styles.panel}>
            {first && passage && (
              <section className={styles.passage}>
                {passage.title && <h3>{passage.title}</h3>}
                <Media image={passage.imageUrl} audio={groupAudio} />
                {part <= 4 ? (
                  <ListeningTranscript
                    part={part}
                    scripts={[
                      passage.content,
                      passage.transcript,
                      ...passage.questions
                        .filter((q) => !q.audioUrl || q.audioUrl === groupAudio)
                        .map((q) => q.transcript),
                    ]}
                  />
                ) : (
                  <RichText
                    value={passage.content}
                    variant="document"
                    lang="en"
                    blankLabel={part === 6 ? blankLabels(passage.questions, labels) : undefined}
                  />
                )}
              </section>
            )}
            <Question
              question={question}
              number={number}
              shown={sharedMedia}
              passage={passage}
              showTranscript={part <= 4 && (!passage || hasSeparateAudio)}
            />
          </article>
        );
      })}
    </div>
  );
}
