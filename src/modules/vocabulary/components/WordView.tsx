import type { ReactNode } from "react";

import { Badge } from "@/shared/components/ui";

import type { WordDto } from "../types/vocabulary.types";
import { formatPartOfSpeech } from "../utils/vocabulary-format";
import { AudioButton } from "./AudioButton";
import styles from "./WordView.module.css";

export type WordDensity = "card" | "row" | "sheet";

interface WordViewProps {
  word: WordDto;
  /** card: front of a flashcard; row: list item; sheet: full detail (back of a card). */
  density?: WordDensity;
  /** Trailing slot, e.g. a status badge. */
  aside?: ReactNode;
  /** Hide the meaning (front side of a card). */
  hideMeaning?: boolean;
  /** Smaller headword for grids (density "card"). */
  compact?: boolean;
}

export function WordView({
  word,
  density = "row",
  aside,
  hideMeaning = false,
  compact = false,
}: WordViewProps) {
  const pos = <Badge tone="blue">{formatPartOfSpeech(word.partOfSpeech)}</Badge>;

  if (density === "row") {
    return (
      <div className={styles.row}>
        <AudioButton text={word.headword} />
        <div className={styles.rowMain}>
          <div className={styles.rowHead}>
            <span className={styles.rowHeadword}>{word.headword}</span>
            {word.phonetic && <span className={styles.phonetic}>{word.phonetic}</span>}
            {pos}
          </div>
          {!hideMeaning && <span className={styles.rowMeaning}>{word.meaningVi}</span>}
        </div>
        {aside && <div className={styles.aside}>{aside}</div>}
      </div>
    );
  }

  if (density === "card") {
    return (
      <div className={styles.card} data-compact={compact || undefined}>
        <span className={styles.cardHeadword} lang="en">
          {word.headword}
        </span>
        <div className={styles.cardMeta}>
          {word.phonetic && <span className={styles.phonetic}>{word.phonetic}</span>}
          {pos}
          {word.cefr && <Badge tone="pearl">{word.cefr}</Badge>}
        </div>
        <AudioButton text={word.headword} size={compact ? "sm" : "lg"} />
        {!hideMeaning && <span className={styles.cardMeaning}>{word.meaningVi}</span>}
        {aside}
      </div>
    );
  }

  return (
    <div className={styles.sheet}>
      <div className={styles.sheetHead}>
        <span className={styles.sheetHeadword} lang="en">
          {word.headword}
        </span>
        <AudioButton text={word.headword} />
      </div>
      <div className={styles.cardMeta}>
        {word.phonetic && <span className={styles.phonetic}>{word.phonetic}</span>}
        {pos}
      </div>
      <p className={styles.sheetMeaning}>{word.meaningVi}</p>
      {word.example && (
        <div className={styles.example}>
          <div className={styles.exampleLine}>
            <p lang="en">{word.example}</p>
            <AudioButton text={word.example} label="Phát âm câu ví dụ" />
          </div>
          {word.exampleVi && <p className={styles.exampleVi}>{word.exampleVi}</p>}
        </div>
      )}
      {word.synonyms.length > 0 && (
        <div className={styles.synonyms}>
          <span className={styles.synonymLabel}>Đồng nghĩa</span>
          {word.synonyms.map((synonym) => (
            <Badge key={synonym}>{synonym}</Badge>
          ))}
        </div>
      )}
      {aside}
    </div>
  );
}
