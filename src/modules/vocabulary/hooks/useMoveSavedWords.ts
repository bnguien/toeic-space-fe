import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

/** Moves saved words one by one (no bulk route); stops at the first failure. */
export function useMoveSavedWords() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: async ({
      savedWordIds,
      folderId,
    }: {
      savedWordIds: string[];
      folderId: string | null;
    }) => {
      for (const id of savedWordIds) {
        await vocabularyApi.updateSavedWord(id, { folderId });
      }
    },
    onSettled: () => invalidate(),
  });
}
