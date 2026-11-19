import type { CSSProperties } from "react";

import type { PracticeSpaceMode } from "../../types/practice-exam.types";

/**
 * Colour family of each space mode, as the `--tone-*` variables read by the shared UI (ProgressBar
 * tone="tone", Badge tone="tone", Button variant "tone") and by the space components. Exam = navy,
 * Listening = blue, Reading = rose (module README); history stays navy. Every value is a token, so
 * the tones follow the colour mode.
 */
export type SpaceTone = "navy" | "blue" | "rose";

const TONES: Record<SpaceTone, Record<string, string>> = {
  navy: {
    "--tone-fill": "var(--ui-navy)",
    "--tone-on-fill": "var(--ui-on-fill)",
    "--tone-soft": "var(--ui-blue-soft)",
    "--tone-line": "var(--ui-blue-line)",
    "--tone-strong": "var(--ui-navy-text)",
    "--tone-bar": "var(--ui-blue)",
  },
  blue: {
    "--tone-fill": "var(--ui-accent-fill)",
    "--tone-on-fill": "var(--ui-on-fill)",
    "--tone-soft": "var(--ui-blue-soft)",
    "--tone-line": "var(--ui-blue-line)",
    "--tone-strong": "var(--ui-blue-strong)",
    "--tone-bar": "var(--ui-blue)",
  },
  rose: {
    "--tone-fill": "var(--ui-rose-fill)",
    "--tone-on-fill": "var(--ui-on-fill)",
    "--tone-soft": "var(--ui-rose-soft)",
    "--tone-line": "var(--ui-rose-line)",
    "--tone-strong": "var(--ui-rose-strong)",
    "--tone-bar": "var(--ui-rose)",
  },
};

export const toneStyle = (tone: SpaceTone): CSSProperties => TONES[tone] as CSSProperties;

export const MODE_TONE: Record<PracticeSpaceMode, SpaceTone> = {
  exam: "navy",
  listening: "blue",
  reading: "rose",
  history: "navy",
};

export const partTone = (part: number): SpaceTone => (part <= 4 ? "blue" : "rose");
