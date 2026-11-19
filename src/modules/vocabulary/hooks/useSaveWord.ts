import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import type { SaveWordRequest } from "../types/vocabulary.types";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

/** Saves an official word to the library (idempotent). */
export function useSaveWord() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (body: SaveWordRequest) => vocabularyApi.saveWord(body),
    onSuccess: () => invalidate(),
  });
}
