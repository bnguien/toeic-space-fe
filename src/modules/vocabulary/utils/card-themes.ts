import type { StageTone } from "./stage-tones";

/**
 * Colour and pattern of a study card. Each headword always gets the same theme (hash of the
 * text), so colour and shape become a memory cue; two consecutive words never share a hue or
 * a pattern. Hues are the stage tone families; the card style only changes how they are drawn.
 */
export interface CardTheme {
  hue: StageTone;
  /** 1 … CARD_PATTERNS */
  pattern: number;
}

export const CARD_HUES: readonly StageTone[] = ["navy", "green", "amber", "pink", "plum"];
export const CARD_PATTERNS = 8;

/** FNV-1a over the lower-cased text. */
export function hashText(text: string): number {
  let hash = 2166136261;
  for (const char of text.toLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Themes keyed by word id, assigned in queue order. */
export function assignCardThemes(words: ReadonlyArray<{ id: string; headword: string }>) {
  const themes = new Map<string, CardTheme>();
  let previousHue = -1;
  let previousPattern = -1;
  for (const word of words) {
    if (themes.has(word.id)) continue;
    const hash = hashText(word.headword.trim());
    let hue = hash % CARD_HUES.length;
    if (hue === previousHue) hue = (hue + 1 + (hash % (CARD_HUES.length - 1))) % CARD_HUES.length;
    let pattern = Math.floor(hash / 7) % CARD_PATTERNS;
    if (pattern === previousPattern) pattern = (pattern + 1) % CARD_PATTERNS;
    themes.set(word.id, { hue: CARD_HUES[hue], pattern: pattern + 1 });
    previousHue = hue;
    previousPattern = pattern;
  }
  return themes;
}

/** Theme of a word outside a session (e.g. a preview swatch). */
export const cardThemeOf = (headword: string): CardTheme => {
  const hash = hashText(headword.trim());
  return {
    hue: CARD_HUES[hash % CARD_HUES.length],
    pattern: (Math.floor(hash / 7) % CARD_PATTERNS) + 1,
  };
};
