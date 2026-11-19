import { useMutation, useQueryClient } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { SavedWordDto, WordDto, WordEditRequest } from "../types/vocabulary.types";
import { patchWordInCaches } from "../utils/word-cache";

/** The word as the learner now sees it: overlay fields plus the library note. */
export const editedWordOf = (saved: SavedWordDto): WordDto => ({
  ...saved.word,
  note: saved.note ?? saved.word.note ?? null,
});

/**
 * Saves the learner's own version of a word and patches it into every cached response, so the
 * current page (and an open study session) keeps its place.
 */
export function useUpdateWordEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wordId, body }: { wordId: string; body: WordEditRequest }) =>
      vocabularyApi.updateWordEdit(wordId, body),
    onSuccess: (saved) => {
      patchWordInCaches(queryClient, editedWordOf(saved), saved.id);
      // Editing an unsaved word adds it to the library: refresh counts and lists in the background.
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.library() });
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.savedWords() });
    },
  });
}
