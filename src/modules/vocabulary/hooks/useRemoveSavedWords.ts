import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

/** Removes saved words one by one (no bulk route); stops at the first failure. */
export function useRemoveSavedWords() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: async (savedWordIds: string[]) => {
      for (const id of savedWordIds) {
        await vocabularyApi.removeSavedWord(id);
      }
    },
    onSettled: () => invalidate(),
  });
}
