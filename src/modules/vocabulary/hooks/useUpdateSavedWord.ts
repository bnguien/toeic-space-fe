import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import type { UpdateSavedWordRequest } from "../types/vocabulary.types";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

/** Moves a saved word, edits its note, or edits a custom word. */
export function useUpdateSavedWord() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ savedWordId, body }: { savedWordId: string; body: UpdateSavedWordRequest }) =>
      vocabularyApi.updateSavedWord(savedWordId, body),
    onSuccess: () => invalidate(),
  });
}
