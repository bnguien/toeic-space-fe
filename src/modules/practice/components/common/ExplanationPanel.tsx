import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus, Lightbulb } from "lucide-react";

import { AudioButton, importVocabularyWords } from "@/modules/vocabulary";
import { RichText } from "@/shared/components/RichText";
import { cx } from "@/shared/components/ui";

import type { GroupQuestion } from "../../utils/attemptGroups";
import { normalizeExplanation, type VocabCard } from "../../utils/explanation";
import styles from "./ExplanationPanel.module.css";

export interface ExplanationPanelProps {
  question: GroupQuestion;
  /** Open by default (a group with one question). */
  defaultOpen?: boolean;
  /** Hide the save button (guests / review of another account). */
  canSaveWords?: boolean;
  className?: string;
}

/**
 * "Giải thích câu N" accordion: normalised explanation HTML (RichText only), the "💡" note and the
 * vocabulary cards (speak + save to the learner's word library). Renders nothing before reveal.
 */
export function ExplanationPanel({
  question,
  defaultOpen = false,
  canSaveWords = true,
  className,
}: ExplanationPanelProps) {
  const normalized = useMemo(
    () => normalizeExplanation(question.reveal?.explanation),
    [question.reveal?.explanation],
  );
  if (!question.reveal) return null;
  const empty = !normalized.html && !normalized.note && normalized.vocab.length === 0;

  return (
    <details className={cx(styles.panel, className)} open={defaultOpen}>
      <summary className={styles.summary}>
        <span>Giải thích câu {question.number}</span>
        {normalized.vocab.length > 0 && (
          <span className={styles.pill}>{normalized.vocab.length} từ vựng</span>
        )}
      </summary>
      <div className={styles.body}>
        {empty && <p className={styles.empty}>Câu này chưa có lời giải.</p>}
        {normalized.html && <RichText value={normalized.html} variant="explanation" />}
        {normalized.note && (
          <p className={styles.note}>
            <Lightbulb size={16} aria-hidden="true" />
            <span>{normalized.note}</span>
          </p>
        )}
        {normalized.vocab.length > 0 && (
          <ul className={styles.cards} aria-label="Từ vựng">
            {normalized.vocab.map((card) => (
              <VocabItem key={card.word} card={card} canSave={canSaveWords} />
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function VocabItem({ card, canSave }: { card: VocabCard; canSave: boolean }) {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      importVocabularyWords({
        items: [
          {
            headword: card.word,
            meaningVi: card.meaningVi || undefined,
            phonetic: card.ipa || undefined,
            partOfSpeech: card.pos || undefined,
            example: card.exampleEn || undefined,
            exampleVi: card.exampleVi || undefined,
          },
        ],
        folderId: null,
        createFoldersFromCategories: false,
      }),
  });
  const saved = save.isSuccess && save.data.failed.length === 0;
  const hasExamples = Boolean(card.exampleEn || card.exampleVi);

  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <strong lang="en" className={styles.word}>
          {card.word}
        </strong>
        <AudioButton text={card.word} />
        {card.pos && <span className={styles.pos}>{card.pos}</span>}
        {card.ipa && <span className={styles.ipa}>/{card.ipa.replace(/^\/|\/$/g, "")}/</span>}
        {card.cefr && <span className={styles.cefr}>{card.cefr}</span>}
        {canSave && (
          <button
            type="button"
            className={styles.save}
            data-saved={saved || undefined}
            disabled={save.isPending || saved}
            onClick={() => save.mutate()}
          >
            {saved ? (
              <BookmarkCheck size={14} aria-hidden="true" />
            ) : (
              <BookmarkPlus size={14} aria-hidden="true" />
            )}
            {saved ? "Đã lưu" : save.isPending ? "Đang lưu…" : "Lưu từ"}
          </button>
        )}
      </div>
      {card.meaningVi && (
        <p className={styles.meaning}>
          <span>Nghĩa:</span> {card.meaningVi}
        </p>
      )}
      {save.isError && (
        <p className={styles.error} role="alert">
          Chưa lưu được từ này. Thử lại nhé.
        </p>
      )}
      {hasExamples && (
        <button
          type="button"
          className={styles.more}
          aria-expanded={examplesOpen}
          onClick={() => setExamplesOpen((value) => !value)}
        >
          {examplesOpen ? "▴ Ẩn câu ví dụ" : "▾ Xem câu ví dụ"}
        </button>
      )}
      {examplesOpen && (
        <div className={styles.examples}>
          {card.exampleEn && <p lang="en">{card.exampleEn}</p>}
          {card.exampleVi && <p className={styles.exampleVi}>{card.exampleVi}</p>}
        </div>
      )}
    </li>
  );
}
