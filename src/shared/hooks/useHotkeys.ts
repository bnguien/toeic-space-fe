import { useEffect, useEffectEvent } from "react";

const TEXT_INPUT_SELECTOR = "input, textarea, select, [contenteditable='true']";
const ACTIVATION_KEYS = new Set([" ", "Enter"]);

/**
 * Listens to window keydown while `enabled`.
 * Keys typed into text fields, chords with Ctrl/Meta/Alt and auto-repeats are ignored,
 * and Space/Enter on a focused button or link are left to that element.
 */
export function useHotkeys(handler: (event: KeyboardEvent) => void, enabled = true) {
  const onKey = useEffectEvent(handler);

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(TEXT_INPUT_SELECTOR)) return;
      if (ACTIVATION_KEYS.has(event.key) && target?.closest("button, a[href]")) return;

      onKey(event);
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}
