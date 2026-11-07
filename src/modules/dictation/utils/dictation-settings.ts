/**
 * Play settings of the dictation screen, remembered per learner and SEPARATELY for each mode (Cơ bản / Pro):
 * basic defaults to more support, Pro to exam-like conditions. The sound choice made in the map's mode
 * dialog overrides the stored one when a stage starts.
 */
import { getLearnerSnapshot, updateLearner } from "./learner-store";

export type PlayMode = "basic" | "pro";
export type PaceKey = "chill" | "normal" | "fast" | "custom";
export type LiveCheck = "off" | "after" | "word";
export type MeaningMode = "always" | "after" | "never";
export type Appearance = "system" | "light" | "dark";
export type Backdrop = "bubbles" | "video";
export type AccentKey = "auto" | "en-US" | "en-GB" | "en-AU";

export interface PlaySettings {
  pace: PaceKey;
  rate: number;
  repeat: number;
  /** Seconds before moving on after a correct sentence; 0 = press Enter. */
  autoNext: number;
  accent: AccentKey;
  autoPlay: boolean;
  liveCheck: LiveCheck;
  /** Wrong submissions before the answer opens by itself; 0 = never. */
  revealAfter: number;
  showMeaning: MeaningMode;
  firstLetter: boolean;
  showIpa: boolean;
  speakMeaning: boolean;
  typingSound: boolean;
  feedbackSound: boolean;
  backgroundMusic: boolean;
  appearance: Appearance;
  backdrop: Backdrop;
}

/** Sound switches chosen in the map's mode dialog (router state of the play page). */
export interface SoundChoice {
  backgroundMusic?: boolean;
  typingSound?: boolean;
  feedbackSound?: boolean;
}

type FixedPace = Exclude<PaceKey, "custom">;

/** Pace: one control for the reading speed, the number of plays and auto-advance. */
export const PACES: Record<
  FixedPace,
  { name: string; rate: number; repeat: number; autoNext: number }
> = {
  chill: { name: "Thong thả", rate: 0.8, repeat: 2, autoNext: 0 },
  normal: { name: "Vừa", rate: 1, repeat: 1, autoNext: 0 },
  fast: { name: "Tăng tốc", rate: 1.1, repeat: 1, autoNext: 1.5 },
};

export const RATES = [0.6, 0.75, 0.9, 1, 1.15, 1.3];
export const SLOW_RATE = 0.6;
export const REVEAL_STEPS: [number, string][] = [
  [2, "2 lần"],
  [3, "3 lần"],
  [5, "5 lần"],
  [0, "Không"],
];
export const AUTO_NEXT_STEPS: [number, string][] = [
  [0, "Bấm Enter"],
  [1.5, "Sau 1,5s"],
  [3, "Sau 3s"],
];
export const LIVE_CHECKS: [LiveCheck, string][] = [
  ["off", "Khi nộp"],
  ["after", "Sau lần đầu"],
  ["word", "Từng từ"],
];
export const MEANING_MODES: [MeaningMode, string][] = [
  ["always", "Luôn hiện"],
  ["after", "Sau khi nộp"],
  ["never", "Ẩn"],
];

type ModeDefaults = Pick<
  PlaySettings,
  "pace" | "liveCheck" | "revealAfter" | "showMeaning" | "firstLetter"
>;

const BY_MODE: Record<PlayMode, ModeDefaults> = {
  basic: {
    pace: "normal",
    liveCheck: "after",
    revealAfter: 3,
    showMeaning: "always",
    firstLetter: false,
  },
  pro: {
    pace: "normal",
    liveCheck: "off",
    revealAfter: 5,
    showMeaning: "after",
    firstLetter: false,
  },
};

const BASE: Omit<PlaySettings, keyof ModeDefaults> = {
  rate: 1,
  repeat: 1,
  autoNext: 0,
  accent: "auto",
  autoPlay: true,
  showIpa: true,
  speakMeaning: false,
  typingSound: true,
  feedbackSound: true,
  backgroundMusic: false,
  appearance: "system",
  backdrop: "bubbles",
};

const modeKey = (mode: string): PlayMode => (mode === "pro" ? "pro" : "basic");

/** Settings of `mode`; `sound` = the switches just chosen in the map dialog. */
export function loadSettings(mode: string, sound: SoundChoice = {}): PlaySettings {
  const key = modeKey(mode);
  const saved = (getLearnerSnapshot().settings[key] ?? {}) as Partial<PlaySettings>;
  const merged: PlaySettings = { ...BASE, ...BY_MODE[key], ...saved };
  if (typeof sound.backgroundMusic === "boolean") merged.backgroundMusic = sound.backgroundMusic;
  if (typeof sound.typingSound === "boolean") merged.typingSound = sound.typingSound;
  if (typeof sound.feedbackSound === "boolean") merged.feedbackSound = sound.feedbackSound;
  return merged;
}

export function saveSettings(mode: string, settings: PlaySettings): void {
  const key = modeKey(mode);
  updateLearner(["settings"], (state) => ({
    ...state,
    settings: { ...state.settings, [key]: { ...settings } },
  }));
}

/** Changes one entry: touching speed / plays / auto-advance turns the pace into "Tuỳ chỉnh". */
export function patchSettings(settings: PlaySettings, patch: Partial<PlaySettings>): PlaySettings {
  if (patch.pace && patch.pace !== "custom" && PACES[patch.pace]) {
    const { rate, repeat, autoNext } = PACES[patch.pace];
    return { ...settings, pace: patch.pace, rate, repeat, autoNext };
  }
  const touchesPace = (["rate", "repeat", "autoNext"] as const).some((key) => key in patch);
  return { ...settings, ...patch, ...(touchesPace ? { pace: "custom" as const } : {}) };
}

/** Voice key chosen in the settings drawer ("" = server default). */
export function readVoicePreference(): string {
  return getLearnerSnapshot().voice;
}

export function saveVoicePreference(voice: string): void {
  updateLearner(["voice"], (state) => ({ ...state, voice }));
}
