import { useEffect, useEffectEvent, useState } from "react";

import { enterFullscreen, exitFullscreen } from "../../hooks/useFullscreen";

/** Text fields keep their keys; radios and buttons do not (the workspace owns ←/→/1–4 there). */
const TEXT_FIELD =
  "textarea, select, [contenteditable='true'], input:not([type='radio']):not([type='checkbox']):not([type='button'])";

export interface WorkspaceKeyHandlers {
  /** Space / Ctrl+P. Return false to let the key through (no audio in the group). */
  togglePlay: () => boolean;
  back: () => void;
  previous: () => void;
  next: () => void;
  /** 1–4 → A–D. Return false when the group does not take it. */
  answer: (index: number) => boolean;
}

/**
 * Workspace shortcuts (port of the StudyChill hotkeys): Space / Ctrl+P play-pause, Shift+← −3 s,
 * ←/→ previous/next group, 1–4 answer. Like the shared `useHotkeys` it skips text fields,
 * auto-repeats and Space/Enter on a focused button, but it still works while a radio of an
 * option has focus (that is where the focus sits after a click), and it handles Ctrl+P.
 */
export function useWorkspaceKeys(handlers: WorkspaceKeyHandlers, enabled: boolean) {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(TEXT_FIELD)) return;
    if (document.querySelector("dialog[open]")) return;
    const ctrlP = (event.ctrlKey || event.metaKey) && event.code === "KeyP";
    if (!ctrlP && (event.ctrlKey || event.metaKey || event.altKey)) return;
    if (event.code === "Space" || ctrlP) {
      if (!ctrlP && target?.closest("button, a[href], summary")) return;
      if (handlers.togglePlay()) event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft" && event.shiftKey) {
      event.preventDefault();
      handlers.back();
    } else if (event.key === "ArrowLeft" && !event.shiftKey) {
      event.preventDefault();
      handlers.previous();
    } else if (event.key === "ArrowRight" && !event.shiftKey) {
      event.preventDefault();
      handlers.next();
    } else if (/^[1-4]$/.test(event.key) && !event.shiftKey) {
      if (handlers.answer(Number(event.key) - 1)) event.preventDefault();
    }
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      onKey(event);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}

/**
 * Desktop only: enters fullscreen at once, and again on the first click or key if the browser
 * wanted a gesture (StudyChill ≈940–961). Leaves fullscreen on unmount.
 */
export function useAutoFullscreen(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    enterFullscreen();
    const onGesture = () => {
      enterFullscreen();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      exitFullscreen();
    };
  }, [enabled]);
}

/**
 * Elapsed practice time: the seconds already recorded on the attempt plus the visible time since
 * the page opened. Stops while the tab is hidden or once `running` is false.
 */
export function useElapsedSeconds(base: number, running: boolean) {
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setExtra((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return base + extra;
}
