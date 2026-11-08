import { useQuery } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import { shouldRetryQuery } from "../utils/vocabulary-errors";

const LOOKUP_STALE_MS = 10 * 60 * 1000;

/**
 * Two-pass lookup of a (debounced) word or phrase: a fast pass without AI, then — only when the
 * result is incomplete — a second pass with AI. Returns the best result so far.
 */
export function useWordLookup(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  const enabled = normalized.length > 0;

  const fast = useQuery({
    queryKey: vocabularyQueryKeys.lookup(normalized, false),
    queryFn: ({ signal }) => vocabularyApi.lookup({ text: normalized, allowAi: false }, signal),
    enabled,
    staleTime: LOOKUP_STALE_MS,
    retry: shouldRetryQuery,
  });

  const needsAi = !!fast.data && !fast.data.complete;
  const deep = useQuery({
    queryKey: vocabularyQueryKeys.lookup(normalized, true),
    queryFn: ({ signal }) => vocabularyApi.lookup({ text: normalized, allowAi: true }, signal),
    enabled: enabled && needsAi,
    staleTime: LOOKUP_STALE_MS,
    retry: false,
  });

  return {
    text: normalized,
    data: deep.data ?? fast.data,
    /** First pass running. */
    loading: enabled && fast.isPending,
    /** AI pass running. */
    scanning: needsAi && deep.isFetching,
    error: fast.isError ? fast.error : null,
    retry: () => void fast.refetch(),
  };
}
