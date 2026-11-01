import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

export function useRemoveSavedWord() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (savedWordId: string) => vocabularyApi.removeSavedWord(savedWordId),
    onSuccess: () => invalidate(),
  });
}
