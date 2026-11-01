import type { PreferencesDto } from "../types/vocabulary.types";

/** Values used until the server answers, and for guests. */
export const DEFAULT_PREFERENCES: PreferencesDto = {
  fontScale: 1,
  sidebarCollapsed: false,
  sidebarWidth: null,
  snowfall: false,
  autoPlayAudio: true,
  defaultMode: "Flashcard",
  dailyGoal: 20,
  lastStageId: null,
  lastView: "Roadmap",
  lastFolderId: null,
  lastFolderPickerId: null,
};

export const FONT_SCALES = [0.875, 1, 1.125, 1.25] as const;

const STORAGE_KEY = "toeicspace.vocabulary.guestPreferences";

/** Snowfall starts on only on wide screens. */
const initialSnowfall = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(min-width: 768px)").matches;

const read = (): PreferencesDto => {
  const base = { ...DEFAULT_PREFERENCES, snowfall: initialSnowfall() };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...base, ...(JSON.parse(raw) as Partial<PreferencesDto>) } : base;
  } catch {
    return base;
  }
};

let snapshot: PreferencesDto | null = null;
const listeners = new Set<() => void>();

/**
 * Guest-only preference store (localStorage). Signed-in learners never write here:
 * their preferences live in `me/preferences`.
 */
export const guestPreferences = {
  get: (): PreferencesDto => {
    snapshot ??= read();
    return snapshot;
  },
  set: (patch: Partial<PreferencesDto>) => {
    snapshot = { ...guestPreferences.get(), ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* storage unavailable: keep the in-memory value */
    }
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Defaults for a signed-in learner before the server answers. */
  serverFallback: (): PreferencesDto => ({ ...DEFAULT_PREFERENCES, snowfall: initialSnowfall() }),
};
