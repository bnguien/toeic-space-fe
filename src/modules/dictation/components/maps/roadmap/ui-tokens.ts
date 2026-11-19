/**
 * Reads TOEIC Space colour tokens (`--ui-*` in `src/styles/globals.css`) for canvas painting, where
 * CSS variables are not available. Values are normalised to `#rrggbb` so the mixers in map-art can
 * blend them; a token that cannot be read falls back to the light-theme hex.
 */

const HEX6 = /^#[0-9a-f]{6}$/i;
const HEX3 = /^#[0-9a-f]{3}$/i;
const RGB = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i;

function toHex(value: string): string | null {
  const v = value.trim();
  if (HEX6.test(v)) return v.toLowerCase();
  if (HEX3.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  const m = RGB.exec(v);
  if (m) {
    return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
  }
  return null;
}

/** `#rrggbb` value of a `--ui-*` token, or `fallback` when it cannot be resolved. */
export function uiToken(name: string, fallback: string): string {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    return toHex(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Same token as a `0xrrggbb` number for Phaser graphics / tints. */
export function uiTokenInt(name: string, fallback: string): number {
  return parseInt(uiToken(name, fallback).slice(1), 16);
}
