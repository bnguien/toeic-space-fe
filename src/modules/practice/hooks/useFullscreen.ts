import { useCallback, useSyncExternalStore } from "react";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const fullscreenElement = () =>
  typeof document === "undefined"
    ? null
    : (document.fullscreenElement ?? (document as WebkitDocument).webkitFullscreenElement ?? null);

const subscribe = (onChange: () => void) => {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
};

/** Enters fullscreen on the whole page (ignored when blocked, e.g. iOS or no user gesture). */
export function enterFullscreen() {
  try {
    if (fullscreenElement()) return;
    const root = document.documentElement as WebkitElement;
    if (root.requestFullscreen) void root.requestFullscreen().catch(() => {});
    else root.webkitRequestFullscreen?.();
  } catch {
    /* blocked */
  }
}

export function exitFullscreen() {
  try {
    if (!fullscreenElement()) return;
    const doc = document as WebkitDocument;
    if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {});
    else doc.webkitExitFullscreen?.();
  } catch {
    /* ignore */
  }
}

/** Fullscreen state of the page plus enter / exit / toggle. */
export function useFullscreen() {
  const isFullscreen = useSyncExternalStore(
    subscribe,
    () => fullscreenElement() !== null,
    () => false,
  );
  const supported =
    typeof document !== "undefined" &&
    Boolean(
      document.documentElement.requestFullscreen ??
      (document.documentElement as WebkitElement).webkitRequestFullscreen,
    );
  const toggle = useCallback(
    () => (fullscreenElement() ? exitFullscreen() : enterFullscreen()),
    [],
  );
  return { isFullscreen, supported, enter: enterFullscreen, exit: exitFullscreen, toggle };
}
