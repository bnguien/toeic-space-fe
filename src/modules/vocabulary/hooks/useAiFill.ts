import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

/** Fills blank fields of a custom word with AI. */
export function useAiFill() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (savedWordId: string) => vocabularyApi.aiFill(savedWordId),
    retry: false,
    onSuccess: () => invalidate(),
  });
}
