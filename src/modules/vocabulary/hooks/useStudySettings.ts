import { useCallback } from "react";

import type { StudySettingsDto } from "../types/vocabulary.types";
import { useVocabularyPreferences } from "./useVocabularyPreferences";

/**
 * Study settings (`preferences.study`) plus the top-level study toggles. Persisted through the
 * debounced `PUT me/preferences` for learners, localStorage for guests.
 */
export function useStudySettings() {
  const { preferences, update } = useVocabularyPreferences();

  const change = useCallback(
    (patch: Partial<StudySettingsDto>) => update({ study: patch }),
    [update],
  );

  return {
    settings: preferences.study,
    autoPlayAudio: preferences.autoPlayAudio,
    snowfall: preferences.snowfall,
    change,
    update,
  };
}
