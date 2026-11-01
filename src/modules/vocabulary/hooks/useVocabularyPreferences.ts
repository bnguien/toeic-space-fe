import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { PreferencesDto } from "../types/vocabulary.types";
import { guestPreferences } from "../utils/guest-preferences";
import { shouldRetryQuery } from "../utils/vocabulary-errors";
import { useIsLearner } from "./useIsLearner";

const SAVE_DELAY_MS = 600;
const KEY = vocabularyQueryKeys.preferences();

/**
 * Vocabulary preferences. Signed-in learners read `me/preferences` and write through a debounced,
 * optimistic PUT; guests use the local fallback store.
 */
export function useVocabularyPreferences() {
  const { signedIn, resolving } = useIsLearner();
  const queryClient = useQueryClient();
  const guest = useSyncExternalStore(
    guestPreferences.subscribe,
    guestPreferences.get,
    guestPreferences.get,
  );

  const query = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => vocabularyApi.getPreferences(signal),
    enabled: signedIn,
    staleTime: Infinity,
    retry: shouldRetryQuery,
  });

  const pending = useRef<Partial<PreferencesDto>>({});
  const timer = useRef<number | undefined>(undefined);

  const { mutate } = useMutation({
    mutationFn: (patch: Partial<PreferencesDto>) => vocabularyApi.updatePreferences(patch),
    // Keep changes made while the request was in flight.
    onSuccess: (saved) =>
      queryClient.setQueryData<PreferencesDto>(KEY, { ...saved, ...pending.current }),
  });

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length > 0) mutate(patch);
  }, [mutate]);

  useEffect(() => flush, [flush]);

  const update = useCallback(
    (patch: Partial<PreferencesDto>) => {
      if (!signedIn) {
        guestPreferences.set(patch);
        return;
      }
      queryClient.setQueryData<PreferencesDto>(KEY, (current) =>
        current ? { ...current, ...patch } : current,
      );
      pending.current = { ...pending.current, ...patch };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
    },
    [signedIn, queryClient, flush],
  );

  const preferences = signedIn ? (query.data ?? guestPreferences.serverFallback()) : guest;
  const ready = signedIn ? !query.isPending : !resolving;

  return { preferences, ready, update };
}
