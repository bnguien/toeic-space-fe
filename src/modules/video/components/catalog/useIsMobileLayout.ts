import { useSyncExternalStore } from "react";

/** The catalog page swaps its desktop and mobile layouts at this width (CSS and JS agree). */
export const MOBILE_LAYOUT_QUERY = "(max-width: 768px)";

const subscribe = (onChange: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(MOBILE_LAYOUT_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const getSnapshot = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia(MOBILE_LAYOUT_QUERY).matches;

/**
 * True when the mobile layout (≤ 768px) is the visible one. The page renders both layouts and
 * hides one with CSS; the topic rows page themselves, so they are mounted only in the visible one.
 */
export function useIsMobileLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
