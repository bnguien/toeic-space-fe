import { createContext, useContext } from "react";

import type { WordDto } from "../types/vocabulary.types";

interface WithWord {
  word: WordDto;
  savedWordId: string | null;
}

export interface OpenEditOptions {
  /** Called when the sheet closes (saved or not), e.g. to resume a timer. */
  onClose?: () => void;
}

export interface WordEditApi {
  /** The word with the learner's edit from this page applied. */
  applyWord: (word: WordDto) => WordDto;
  /** A study item / library row with its word (and new library entry) applied. */
  applyItem: <T extends WithWord>(item: T) => T;
  openEdit: (word: WordDto, options?: OpenEditOptions) => void;
  /** True while the edit sheet is open. */
  editing: boolean;
  /** False without a provider (e.g. guests): pencil buttons hide. */
  canEdit: boolean;
}

export const WordEditContext = createContext<WordEditApi>({
  applyWord: (word) => word,
  applyItem: (item) => item,
  openEdit: () => undefined,
  editing: false,
  canEdit: false,
});

/** Personal word edits of the surrounding `WordEditProvider`. */
export const useWordEdits = () => useContext(WordEditContext);
