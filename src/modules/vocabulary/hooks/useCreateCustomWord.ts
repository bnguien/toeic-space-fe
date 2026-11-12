import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import type { CreateCustomWordRequest } from "../types/vocabulary.types";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

export function useCreateCustomWord() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (body: CreateCustomWordRequest) => vocabularyApi.createCustomWord(body),
    onSuccess: () => invalidate(),
  });
}
