import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  clampCourseSide,
  COURSE_SIDE_STORAGE_KEY,
  COURSE_SPLIT_BUTTON_ATTR,
  courseSideFromPointer,
  courseSideStyle,
  readCourseSide,
  type CourseSideState,
} from "./courseSidePanel";

const KEY_STEP = 32;
const FALLBACK_WIDTH = 380;

/**
 * Curriculum column of the course pages: drag the divider to resize it, snap it
 * closed, reopen with the same button; the width is remembered per browser.
 */
export function useCourseSidePanel(
  shellRef: RefObject<HTMLElement | null>,
  sideRef: RefObject<HTMLElement | null>,
) {
  const [side, setSide] = useState<CourseSideState>(readCourseSide);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COURSE_SIDE_STORAGE_KEY, JSON.stringify(side));
    } catch {
      /* private mode: kept for this visit only */
    }
  }, [side]);

  const toggle = () => setSide((value) => ({ ...value, collapsed: !value.collapsed }));
  const setWidth = (width: number) => setSide({ width: clampCourseSide(width), collapsed: false });
  const currentWidth = () =>
    sideRef.current?.getBoundingClientRect().width || side.width || FALLBACK_WIDTH;

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as Element).closest(`[${COURSE_SPLIT_BUTTON_ATTR}]`))
      return;
    const shell = shellRef.current;
    if (!shell) return;
    event.preventDefault();
    const left = shell.getBoundingClientRect().left;
    setDragging(true);
    const move = (moveEvent: PointerEvent) => {
      const width = moveEvent.clientX - left;
      setSide((value) => courseSideFromPointer(width, value));
    };
    const release = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setWidth(currentWidth() - KEY_STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (side.collapsed) toggle();
      else setWidth(currentWidth() + KEY_STEP);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  return {
    side,
    collapsed: side.collapsed,
    hasWidth: !!side.width,
    dragging,
    style: courseSideStyle(side) as CSSProperties | undefined,
    toggle,
    reset: () => setSide({ width: null, collapsed: false }),
    onPointerDown,
    onKeyDown,
  };
}

export type CourseSidePanel = ReturnType<typeof useCourseSidePanel>;
