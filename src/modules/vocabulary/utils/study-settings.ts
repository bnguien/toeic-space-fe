import type { PreferencesDto, PreferencesPatch, StudySettingsDto } from "../types/vocabulary.types";

/** Server defaults of `preferences.study` (contract v4, section C). */
export const DEFAULT_STUDY_SETTINGS: StudySettingsDto = {
  reelSeconds: 5,
  quizSeconds: 15,
  hintFirstLetter: true,
  hintProgressive: true,
  speakMeaning: false,
  flashcardFront: "word",
  showExample: true,
  sfx: true,
  sfxVolume: 0.8,
  tickStyle: "wood",
  chimeStyle: "bell",
  backdrop: "video",
  cardStyle: "stage",
  layout: "portrait",
};

type RawPreferences = Omit<PreferencesDto, "study"> & { study?: Partial<StudySettingsDto> | null };

/** Fills `study` with defaults (older servers and first visits omit it). */
export function normalizePreferences(raw: RawPreferences): PreferencesDto {
  return { ...raw, study: { ...DEFAULT_STUDY_SETTINGS, ...(raw.study ?? {}) } };
}

/** Applies a partial update; `study` is merged field by field like on the server. */
export function mergePreferences<T extends PreferencesPatch>(base: T, patch: PreferencesPatch): T {
  const merged = { ...base, ...patch } as T;
  if (patch.study) merged.study = { ...base.study, ...patch.study } as T["study"];
  else if (base.study) merged.study = base.study;
  return merged;
}
