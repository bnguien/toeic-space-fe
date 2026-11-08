import { useCallback, useSyncExternalStore } from "react";

/** Live `matchMedia`: rotating the phone or resizing the window switches the layout. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
