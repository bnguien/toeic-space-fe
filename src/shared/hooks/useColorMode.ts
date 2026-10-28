import { useCallback, useEffect, useState } from "react";

export type ColorMode = "light" | "dark";

const STORAGE_KEY = "admin.colorMode";

function storedMode(): ColorMode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

const systemMode = (): ColorMode =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

/**
 * Light or dark admin colours. An explicit choice is remembered in this browser; until then the
 * system preference is followed, including when it changes.
 */
export function useColorMode() {
  const [chosen, setChosen] = useState<ColorMode | null>(storedMode);
  const [system, setSystem] = useState<ColorMode>(systemMode);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    const update = () => setSystem(query.matches ? "dark" : "light");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const mode = chosen ?? system;

  const setMode = useCallback((next: ColorMode) => {
    setChosen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  }, []);

  const toggle = useCallback(() => setMode(mode === "dark" ? "light" : "dark"), [mode, setMode]);

  return { mode, setMode, toggle };
}
