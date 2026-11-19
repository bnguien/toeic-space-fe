import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { GRAMMAR_STORAGE_KEYS } from "../utils/storage-keys";

/** Roadmap column: drag the divider to resize, collapse / reopen; remembered per browser (desktop layout > 760px). */
export const SIDE_MIN = 300;
export const SIDE_MAX = 720;
/** Dragging narrower than this collapses the column. */
const SIDE_SNAP = 220;
const KEY_STEP = 32;
const FALLBACK_WIDTH = 460;

const clampSide = (w: number): number => Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(w)));

export interface SideState {
  width: number | null;
  collapsed: boolean;
}

function readSide(): SideState {
  try {
    const v = JSON.parse(
      localStorage.getItem(GRAMMAR_STORAGE_KEYS.sidePanel) || "{}",
    ) as Partial<SideState>;
    return {
      width: Number.isFinite(v.width) ? clampSide(v.width as number) : null,
      collapsed: !!v.collapsed,
    };
  } catch {
    return { width: null, collapsed: false };
  }
}

/** Attribute of the collapse button inside the divider (a press on it is not a drag). */
export const SPLIT_BUTTON_ATTR = "data-split-btn";

export function useSidePanel(
  shellRef: RefObject<HTMLElement | null>,
  sideRef: RefObject<HTMLElement | null>,
) {
  const [side, setSide] = useState<SideState>(readSide);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(GRAMMAR_STORAGE_KEYS.sidePanel, JSON.stringify(side));
    } catch {
      /* private mode: ignored */
    }
  }, [side]);

  const toggle = () => setSide((v) => ({ ...v, collapsed: !v.collapsed }));
  const setWidth = (w: number) => setSide({ width: clampSide(w), collapsed: false });
  const currentWidth = () => sideRef.current?.getBoundingClientRect().width || FALLBACK_WIDTH;

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as Element).closest(`[${SPLIT_BUTTON_ATTR}]`)) return;
    const shell = shellRef.current;
    if (!shell) return;
    e.preventDefault();
    const left = shell.getBoundingClientRect().left;
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const w = ev.clientX - left;
      setSide(
        w < SIDE_SNAP
          ? (v) => ({ ...v, collapsed: true })
          : { width: clampSide(w), collapsed: false },
      );
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setWidth(currentWidth() - KEY_STEP);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (side.collapsed) toggle();
      else setWidth(currentWidth() + KEY_STEP);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const style =
    side.width && !side.collapsed
      ? ({ "--gp-side-w": `${side.width}px` } as CSSProperties)
      : undefined;
  return {
    side,
    style,
    collapsed: side.collapsed,
    hasWidth: !!side.width,
    dragging,
    toggle,
    reset: () => setSide({ width: null, collapsed: false }),
    /** Applies the preferences saved on the learner's account. */
    restore: (next: SideState) =>
      setSide({
        width: next.width === null ? null : clampSide(next.width),
        collapsed: next.collapsed,
      }),
    onPointerDown,
    onKeyDown,
  };
}

export type SidePanel = ReturnType<typeof useSidePanel>;
