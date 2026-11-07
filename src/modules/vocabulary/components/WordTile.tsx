import type { MouseEvent, ReactNode } from "react";

import { Badge } from "@/shared/components/ui";

import type { WordDto } from "../types/vocabulary.types";
import { formatPartOfSpeech } from "../utils/vocabulary-format";
import { AudioButton } from "./AudioButton";
import styles from "./WordTile.module.css";

interface WordTileProps {
  word: WordDto;
  /** Footer, left: learning status, mistake count… */
  status: ReactNode;
  /** Footer, right: edit, save, menu… */
  actions?: ReactNode;
  selected: boolean;
  /** Something is selected: checkboxes and actions stay visible. */
  selecting: boolean;
  /** `range` = shift-click. */
  onToggleSelect: (range: boolean) => void;
}

/** Stops clicks on inner controls from also toggling the tile. */
const keepInside = (event: MouseEvent) => event.stopPropagation();

/**
 * Compact word card of the "Của tôi" grids: headword · audio · phonetic · part of speech,
 * a two-line meaning, then status and actions. Clicking the card toggles its selection.
 */
export function WordTile({
  word,
  status,
  actions,
  selected,
  selecting,
  onToggleSelect,
}: WordTileProps) {
  return (
    <article
      className={styles.tile}
      data-selected={selected || undefined}
      data-selecting={selecting || undefined}
      onMouseDown={(event) => {
        // Shift-click selects a range of tiles, not the text between them.
        if (event.shiftKey) event.preventDefault();
      }}
      onClick={(event) => onToggleSelect(event.shiftKey)}
    >
      <div className={styles.head}>
        <span className={styles.headword} lang="en">
          {word.headword}
        </span>
        <span className={styles.audio} onClick={keepInside}>
          <AudioButton text={word.headword} />
        </span>
        {word.phonetic && <span className={styles.phonetic}>{word.phonetic}</span>}
        <Badge tone="blue">{formatPartOfSpeech(word.partOfSpeech)}</Badge>
      </div>
      <p className={styles.meaning}>{word.meaningVi}</p>
      <div className={styles.foot}>
        <div className={styles.status}>{status}</div>
        {actions && (
          <div className={styles.actions} onClick={keepInside}>
            {actions}
          </div>
        )}
      </div>
      <label className={styles.check} onClick={keepInside}>
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Chọn ${word.headword}`}
          onChange={() => undefined}
          onClick={(event) => onToggleSelect(event.shiftKey)}
        />
      </label>
    </article>
  );
}
