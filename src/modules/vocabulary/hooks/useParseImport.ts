import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import type { ImportParseRequest } from "../types/vocabulary.types";

/** Server-side parse of a pasted list or JSON into an import preview. */
export function useParseImport() {
  return useMutation({
    mutationFn: (body: ImportParseRequest) => vocabularyApi.parseImport(body),
    retry: false,
  });
}
