/** Width rules of the course curriculum sidebar, kept free of React so they are easy to test. */
export const COURSE_SIDE_MIN = 300;
export const COURSE_SIDE_MAX = 720;
/** Dragging narrower than this collapses the column (like the grammar roadmap). */
export const COURSE_SIDE_SNAP = 240;
export const COURSE_SIDE_STORAGE_KEY = "ts_course_side";
/** Attribute of the collapse button inside the divider: a press on it is not a drag. */
export const COURSE_SPLIT_BUTTON_ATTR = "data-split-btn";

export interface CourseSideState {
  width: number | null;
  collapsed: boolean;
}

export function clampCourseSide(width: number): number {
  return Math.min(COURSE_SIDE_MAX, Math.max(COURSE_SIDE_MIN, Math.round(width)));
}

/** Pointer position during a drag: below the snap threshold the column closes, keeping its last width. */
export function courseSideFromPointer(width: number, previous: CourseSideState): CourseSideState {
  return width < COURSE_SIDE_SNAP
    ? { ...previous, collapsed: true }
    : { width: clampCourseSide(width), collapsed: false };
}

/** Reads the width remembered in this browser; corrupt or missing values fall back to the default grid. */
export function readCourseSide(storage?: Pick<Storage, "getItem">): CourseSideState {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(COURSE_SIDE_STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<CourseSideState>) : {};
    return {
      width:
        typeof value.width === "number" && Number.isFinite(value.width)
          ? clampCourseSide(value.width)
          : null,
      collapsed: !!value.collapsed,
    };
  } catch {
    return { width: null, collapsed: false };
  }
}

/** Inline style applying the dragged width, or undefined to keep the default grid. */
export function courseSideStyle(side: CourseSideState): Record<string, string> | undefined {
  return side.width && !side.collapsed ? { "--gp-side-w": `${side.width}px` } : undefined;
}
