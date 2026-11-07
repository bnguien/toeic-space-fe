import type { ReactNode } from "react";

import { cx } from "@/shared/components/ui";

import type { WordDto } from "../types/vocabulary.types";
import { padOrder } from "../utils/vocabulary-format";
import { WordView } from "./WordView";
import styles from "./WordSelectList.module.css";

interface WordSelectListProps {
  words: WordDto[];
  isSelected: (wordId: string) => boolean;
  /** `range` = shift-click. */
  onToggle: (wordId: string, range: boolean) => void;
  /** Trailing controls of a row (status, edit, save…). */
  aside?: (word: WordDto) => ReactNode;
  /** Shows 01, 02… beside the checkbox. */
  numbered?: boolean;
  label: string;
  className?: string;
}

/** Word rows with a checkbox each; unselected rows fade. */
export function WordSelectList({
  words,
  isSelected,
  onToggle,
  aside,
  numbered = false,
  label,
  className,
}: WordSelectListProps) {
  return (
    <ol className={cx(styles.list, className)} aria-label={label}>
      {words.map((word, index) => {
        const checked = isSelected(word.id);
        return (
          <li key={word.id} className={styles.row} data-selected={checked || undefined}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={checked}
                aria-label={`Chọn ${word.headword}`}
                onChange={() => undefined}
                onClick={(event) => onToggle(word.id, event.shiftKey)}
              />
              {numbered && <span className={styles.index}>{padOrder(index + 1)}</span>}
            </label>
            <WordView word={word} density="row" aside={aside?.(word)} />
          </li>
        );
      })}
    </ol>
  );
}
