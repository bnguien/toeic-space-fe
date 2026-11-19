import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TranslationMode = "parallel" | "bottom" | "hidden";

/** Learner-side display preferences of the practice area (this browser only). */
export interface PracticePrefsState {
  /** Space sidebar width (px), 220..420. */
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  /** Space type scale: 0.875 / 1 / 1.125 / 1.25. */
  fontScale: number;
  /** Reading passage font size (px), 13..18. */
  passageFontSize: number;
  /** How the passage translation is shown once revealed. */
  translationMode: TranslationMode;
  /** Workspace split: left panel share in %, 0..100 (0/100 = one side collapsed). */
  splitRatio: number;
  /** Exam room volume 0..1. */
  examVolume: number;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setFontScale: (scale: number) => void;
  /** Moves the type scale one step up (+1) or down (-1). */
  stepFontScale: (direction: 1 | -1) => void;
  setPassageFontSize: (size: number) => void;
  stepPassageFont: (direction: 1 | -1) => void;
  setTranslationMode: (mode: TranslationMode) => void;
  setSplitRatio: (ratio: number) => void;
  setExamVolume: (volume: number) => void;
}

export const FONT_SCALES = [0.875, 1, 1.125, 1.25] as const;
export const PASSAGE_FONT = { min: 13, max: 18, step: 1.5, initial: 15 } as const;
export const SIDEBAR_WIDTH = { min: 220, max: 420, initial: 360, railBelow: 172 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const nearestScaleIndex = (scale: number): number => {
  let best = 1;
  FONT_SCALES.forEach((value, index) => {
    if (Math.abs(value - scale) < Math.abs(FONT_SCALES[best] - scale)) best = index;
  });
  return best;
};

/** Persisted under `toeicspace.practice.prefs` (same `toeicspace.*` prefix as the site settings). */
export const usePracticePrefsStore = create<PracticePrefsState>()(
  persist(
    (set) => ({
      sidebarWidth: SIDEBAR_WIDTH.initial,
      sidebarCollapsed: false,
      fontScale: 1,
      passageFontSize: PASSAGE_FONT.initial,
      translationMode: "bottom",
      splitRatio: 50,
      examVolume: 0.8,
      setSidebarWidth: (width) =>
        set({ sidebarWidth: clamp(Math.round(width), SIDEBAR_WIDTH.min, SIDEBAR_WIDTH.max) }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setFontScale: (scale) => set({ fontScale: FONT_SCALES[nearestScaleIndex(scale)] }),
      stepFontScale: (direction) =>
        set((state) => ({
          fontScale:
            FONT_SCALES[
              clamp(nearestScaleIndex(state.fontScale) + direction, 0, FONT_SCALES.length - 1)
            ],
        })),
      setPassageFontSize: (size) =>
        set({ passageFontSize: clamp(size, PASSAGE_FONT.min, PASSAGE_FONT.max) }),
      stepPassageFont: (direction) =>
        set((state) => ({
          passageFontSize: clamp(
            state.passageFontSize + direction * PASSAGE_FONT.step,
            PASSAGE_FONT.min,
            PASSAGE_FONT.max,
          ),
        })),
      setTranslationMode: (translationMode) => set({ translationMode }),
      setSplitRatio: (ratio) => set({ splitRatio: clamp(ratio, 0, 100) }),
      setExamVolume: (volume) => set({ examVolume: clamp(volume, 0, 1) }),
    }),
    {
      name: "toeicspace.practice.prefs",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        sidebarCollapsed: state.sidebarCollapsed,
        fontScale: state.fontScale,
        passageFontSize: state.passageFontSize,
        translationMode: state.translationMode,
        splitRatio: state.splitRatio,
        examVolume: state.examVolume,
      }),
    },
  ),
);
