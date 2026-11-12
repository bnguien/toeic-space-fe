import type { CSSProperties } from "react";

/**
 * The one place where each roadmap stage gets its colour family.
 * A stage container sets these `--tone-*` variables once (see `stageToneStyle`); shared components
 * (ProgressBar tone="tone", Eyebrow accent, NumberTile bar, ButtonGlyph/Button variant "tone",
 * Badge tone "tone") and the vocabulary components read them, with the navy family as fallback.
 * Every value is a token, so the tones follow the colour mode (see globals.css).
 */
export type StageTone = "navy" | "green" | "amber" | "pink" | "plum";

interface ToneTokens {
  /** Filled surfaces (selected stage row, next lesson tile, map node); deep in both modes. */
  fill: string;
  /** Text and icons on `fill`: white, or ink on yellow. */
  onFill: string;
  /** Soft chip background. */
  soft: string;
  /** Soft chip outline. */
  line: string;
  /** Text on `soft`, eyebrows. */
  strong: string;
  /** Progress bars and accents on page surfaces (light tint in dark mode). */
  bar: string;
}

const TONES: Record<StageTone, ToneTokens> = {
  navy: {
    fill: "var(--ui-navy)",
    onFill: "var(--ui-on-fill)",
    soft: "var(--ui-blue-soft)",
    line: "var(--ui-blue-line)",
    strong: "var(--ui-blue-strong)",
    bar: "var(--ui-blue)",
  },
  green: {
    fill: "var(--ui-green-fill)",
    onFill: "var(--ui-on-fill)",
    soft: "var(--ui-green-soft)",
    line: "var(--ui-green-line)",
    strong: "var(--ui-green)",
    bar: "var(--ui-green)",
  },
  amber: {
    fill: "var(--ui-mark)",
    onFill: "var(--ui-on-mark)",
    soft: "var(--ui-pearl)",
    line: "var(--ui-pearl-line)",
    strong: "var(--ui-pearl-text)",
    bar: "var(--ui-mark-strong)",
  },
  pink: {
    fill: "var(--ui-pink-fill)",
    onFill: "var(--ui-on-fill)",
    soft: "var(--ui-pink-soft)",
    line: "var(--ui-pink-line)",
    strong: "var(--ui-pink-strong)",
    bar: "var(--ui-pink)",
  },
  plum: {
    fill: "var(--ui-rose-fill)",
    onFill: "var(--ui-on-fill)",
    soft: "var(--ui-rose-soft)",
    line: "var(--ui-rose-line)",
    strong: "var(--ui-rose-strong)",
    bar: "var(--ui-rose)",
  },
};

/** Stage order (1-based) → tone: 250+ navy, 450+ green, 650+ amber, 800+ pink, 990 plum. */
const ORDER_TONES: StageTone[] = ["navy", "green", "amber", "pink", "plum"];

export const stageTone = (order: number): StageTone =>
  ORDER_TONES[(Math.max(1, order) - 1) % ORDER_TONES.length];

/** CSS variables for a stage container. */
export function stageToneStyle(order: number): CSSProperties {
  const tone = TONES[stageTone(order)];
  return {
    "--tone-fill": tone.fill,
    "--tone-on-fill": tone.onFill,
    "--tone-soft": tone.soft,
    "--tone-line": tone.line,
    "--tone-strong": tone.strong,
    "--tone-bar": tone.bar,
  } as CSSProperties;
}
