import { RichText } from "../RichText";
import { uniqueContent } from "./content";
import styles from "./QuestionContent.module.css";

export function QuestionExplanation({
  explanation,
  translations = [],
  correctAnswer,
}: {
  explanation?: string | null;
  translations?: (string | null | undefined)[];
  correctAnswer?: string | null;
}) {
  const available = uniqueContent(translations, [explanation]);
  return (
    <details className={styles.explanation}>
      <summary>Xem lời giải</summary>
      <div>
        {correctAnswer && <p className={styles.answer}>Đáp án đúng: {correctAnswer}</p>}
        {explanation ? (
          <RichText value={explanation} variant="explanation" lang="vi" />
        ) : (
          <p>Chưa có lời giải.</p>
        )}
        {available.length > 0 && (
          <section aria-label="Bản dịch tiếng Việt" className={styles.translations}>
            <h4>Bản dịch tiếng Việt</h4>
            {available.map((value, index) => (
              <RichText key={index} value={value} variant="document" lang="vi" />
            ))}
          </section>
        )}
      </div>
    </details>
  );
}
