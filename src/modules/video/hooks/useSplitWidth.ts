import {
  useCallback,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

const LS_SPLIT_WIDTH = "ts_video_split_px";

function readWidth(): number {
  try {
    return Number(localStorage.getItem(LS_SPLIT_WIDTH)) || 0;
  } catch {
    return 0;
  }
}

function saveWidth(width: number): void {
  try {
    if (width) localStorage.setItem(LS_SPLIT_WIDTH, String(width));
    else localStorage.removeItem(LS_SPLIT_WIDTH);
  } catch {
    /* private mode */
  }
}

/**
 * Desktop divider between the video column and the transcript: drag to resize (remembered in localStorage),
 * ←/→ when focused, Home or double click resets to the default (0 = CSS default width).
 */
export function useSplitWidth(
  mediaRef: RefObject<HTMLElement | null>,
  minVideoWidth: number,
  minTranscriptWidth: number,
) {
  const [splitWidth, setSplitWidth] = useState(readWidth);
  const [dragging, setDragging] = useState(false);

  const clampWidth = useCallback(
    (w: number) =>
      Math.round(Math.min(Math.max(w, minVideoWidth), window.innerWidth - minTranscriptWidth)),
    [minVideoWidth, minTranscriptWidth],
  );

  // While dragging, the YouTube iframe swallows pointer events — the root marks `data-dragging` to disable it.
  const startResize = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !mediaRef.current) return;
      e.preventDefault();
      const leftEdge = mediaRef.current.getBoundingClientRect().left;
      let lastWidth = 0;
      setDragging(true);
      const onMove = (ev: globalThis.PointerEvent) => {
        lastWidth = clampWidth(ev.clientX - leftEdge);
        setSplitWidth(lastWidth);
      };
      const release = () => {
        setDragging(false);
        if (lastWidth) saveWidth(lastWidth);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    },
    [clampWidth, mediaRef],
  );

  const onDividerKey = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!mediaRef.current) return;
      const currentWidth = mediaRef.current.getBoundingClientRect().width;
      let nextWidth: number | null = null;
      if (e.key === "ArrowLeft") nextWidth = clampWidth(currentWidth - 32);
      else if (e.key === "ArrowRight") nextWidth = clampWidth(currentWidth + 32);
      else if (e.key === "Home") nextWidth = 0;
      if (nextWidth === null) return;
      e.preventDefault();
      setSplitWidth(nextWidth);
      saveWidth(nextWidth);
    },
    [clampWidth, mediaRef],
  );

  const resetWidth = useCallback(() => {
    setSplitWidth(0);
    saveWidth(0);
  }, []);

  return { splitWidth, dragging, startResize, onDividerKey, resetWidth };
}
