import { useCallback, useState } from "react";

import { GRAMMAR_STORAGE_KEYS } from "../utils/storage-keys";

type GrammarThemeChoice = "dark" | "light";

function readChoice(): GrammarThemeChoice | null {
  try {
    const v = localStorage.getItem(GRAMMAR_STORAGE_KEYS.theme);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Dark mode of the grammar page, remembered in this browser; light until the learner turns it on (the system
 * preference is not followed). Colours: GrammarTheme.module.css with `data-color-mode="dark"` on the page root.
 */
export function useGrammarTheme() {
  const [choice, setChoice] = useState<GrammarThemeChoice | null>(readChoice);
  const dark = choice ? choice === "dark" : false;
  const toggleDark = useCallback(() => {
    const next: GrammarThemeChoice = dark ? "light" : "dark";
    setChoice(next);
    try {
      localStorage.setItem(GRAMMAR_STORAGE_KEYS.theme, next);
    } catch {
      /* private mode: kept for this visit only */
    }
  }, [dark]);

  /** Applies the choice saved on the learner's account (null = never chosen). */
  const setDarkChoice = useCallback((next: boolean | null) => {
    const value: GrammarThemeChoice | null = next === null ? null : next ? "dark" : "light";
    setChoice(value);
    try {
      if (value) localStorage.setItem(GRAMMAR_STORAGE_KEYS.theme, value);
    } catch {
      /* private mode: kept for this visit only */
    }
  }, []);

  return { dark, chosen: choice !== null, toggleDark, setDarkChoice };
}
