import { useCallback, useMemo, useState, type ReactNode } from "react";

import { useIsLearner } from "../hooks/useIsLearner";
import { editedWordOf } from "../hooks/useUpdateWordEdit";
import { WordEditContext, type OpenEditOptions, type WordEditApi } from "../hooks/useWordEdits";
import type { WordDto } from "../types/vocabulary.types";
import { WordEditSheet } from "./WordEditSheet";

interface Edit {
  word: WordDto;
  savedWordId: string;
}

interface Open {
  word: WordDto;
  options?: OpenEditOptions;
}

/**
 * Hosts the personal edit sheet for a page. Saved edits are kept here and applied while
 * rendering (`applyWord` / `applyItem`), so a study session shows them on the current card
 * without rebuilding its queue. Only signed-in learners can edit.
 */
export function WordEditProvider({ children }: { children: ReactNode }) {
  const { signedIn } = useIsLearner();
  const [edits, setEdits] = useState<ReadonlyMap<string, Edit>>(() => new Map());
  const [open, setOpen] = useState<Open | null>(null);

  const applyWord = useCallback(
    (word: WordDto): WordDto => {
      const edit = edits.get(word.id);
      return edit ? { ...word, ...edit.word } : word;
    },
    [edits],
  );

  const applyItem = useCallback(
    <T extends { word: WordDto; savedWordId: string | null }>(item: T): T => {
      const edit = edits.get(item.word.id);
      return edit
        ? {
            ...item,
            word: { ...item.word, ...edit.word },
            savedWordId: item.savedWordId ?? edit.savedWordId,
          }
        : item;
    },
    [edits],
  );

  const openEdit = useCallback((word: WordDto, options?: OpenEditOptions) => {
    setOpen({ word, options });
  }, []);

  const value = useMemo<WordEditApi>(
    () => ({ applyWord, applyItem, openEdit, editing: open !== null, canEdit: signedIn }),
    [applyWord, applyItem, openEdit, open, signedIn],
  );

  const close = () => {
    open?.options?.onClose?.();
    setOpen(null);
  };

  return (
    <WordEditContext.Provider value={value}>
      {children}
      {open && (
        <WordEditSheet
          key={open.word.id}
          word={applyWord(open.word)}
          onClose={close}
          onSaved={(saved) => {
            setEdits((current) =>
              new Map(current).set(open.word.id, {
                word: editedWordOf(saved),
                savedWordId: saved.id,
              }),
            );
            close();
          }}
        />
      )}
    </WordEditContext.Provider>
  );
}
