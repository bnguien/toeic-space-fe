import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ColorMode = "light" | "dark";
export type ColorModePreference = "system" | ColorMode;

const STORAGE_KEY = "toeicspace.colorMode";
/** Key used before the site-wide setting existed (admin only); read once as a fallback. */
const LEGACY_STORAGE_KEY = "admin.colorMode";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const isMode = (value: unknown): value is ColorMode => value === "light" || value === "dark";

function readPreference(): ColorModePreference {
  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return isMode(stored) || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

const readSystem = (): ColorMode =>
  typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";

/* One shared store, so every toggle (navbar, admin header, study settings) stays in sync. */
let preference: ColorModePreference = typeof window === "undefined" ? "system" : readPreference();
let system: ColorMode = readSystem();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const darkQuery = typeof window === "undefined" ? null : (window.matchMedia?.(DARK_QUERY) ?? null);

function onSystemChange() {
  system = readSystem();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    system = readSystem();
    darkQuery?.addEventListener("change", onSystemChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) darkQuery?.removeEventListener("change", onSystemChange);
  };
}

function setPreference(next: ColorModePreference) {
  preference = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  emit();
}

const getPreference = () => preference;
const getSystem = () => system;

/**
 * Light or dark colours for the whole site. "system" (the default) follows the device, including
 * when it changes; an explicit choice is remembered in this browser.
 */
export function useColorMode() {
  const current = useSyncExternalStore(subscribe, getPreference, () => "system" as const);
  const device = useSyncExternalStore(subscribe, getSystem, () => "light" as const);
  const mode: ColorMode = current === "system" ? device : current;

  const setMode = useCallback((next: ColorMode) => setPreference(next), []);
  const toggle = useCallback(() => setPreference(mode === "dark" ? "light" : "dark"), [mode]);

  return { mode, preference: current, setPreference, setMode, toggle };
}

/* Layouts that apply the colour mode to the document right now (see useColorModeScope). */
let activeScopes = 0;
const getScoped = () => activeScopes > 0;

/**
 * Applies the colour mode to the whole document while the calling layout is mounted. Only areas
 * whose styles use the design tokens call this; everything else keeps the light colours.
 */
export function useColorModeScope(enabled = true) {
  const { mode } = useColorMode();

  useEffect(() => {
    if (!enabled) return;
    activeScopes += 1;
    emit();
    return () => {
      activeScopes -= 1;
      emit();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.dataset.colorMode = mode;
    return () => {
      if (activeScopes === 0) delete root.dataset.colorMode;
    };
  }, [enabled, mode]);

  return mode;
}

/** Whether the current page follows the colour mode, e.g. to show a light/dark toggle. */
export function useColorModeScopeActive() {
  return useSyncExternalStore(subscribe, getScoped, () => false);
}
