import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { PreferencesDto, PreferencesPatch } from "../types/vocabulary.types";
import { guestPreferences } from "../utils/guest-preferences";
import { mergePreferences, normalizePreferences } from "../utils/study-settings";
import { shouldRetryQuery } from "../utils/vocabulary-errors";
import { useIsLearner } from "./useIsLearner";

const SAVE_DELAY_MS = 600;
const KEY = vocabularyQueryKeys.preferences();
const SERVER_FALLBACK = guestPreferences.serverFallback();

/**
 * Vocabulary preferences. Signed-in learners read `me/preferences` and write through a debounced,
 * optimistic PUT; guests use the local fallback store. `study` always carries every setting.
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
    select: normalizePreferences,
    enabled: signedIn,
    staleTime: Infinity,
    retry: shouldRetryQuery,
  });

  const pending = useRef<PreferencesPatch>({});
  const timer = useRef<number | undefined>(undefined);

  const { mutate } = useMutation({
    mutationFn: (patch: PreferencesPatch) => vocabularyApi.updatePreferences(patch),
    // Keep changes made while the request was in flight; a server without `study` keeps ours.
    onSuccess: (saved) =>
      queryClient.setQueryData<PreferencesDto>(KEY, (current) =>
        mergePreferences({ ...saved, study: saved.study ?? current?.study }, pending.current),
      ),
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
    (patch: PreferencesPatch) => {
      if (!signedIn) {
        guestPreferences.set(patch);
        return;
      }
      queryClient.setQueryData<PreferencesDto>(KEY, (current) =>
        current ? mergePreferences(current, patch) : current,
      );
      pending.current = mergePreferences(pending.current, patch);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
    },
    [signedIn, queryClient, flush],
  );

  const preferences = signedIn ? (query.data ?? SERVER_FALLBACK) : guest;
  const ready = signedIn ? !query.isPending : !resolving;

  return { preferences, ready, update };
}
