/** Viewport placement of the select menu. Fixed coordinates keep it inside a scrolling modal. */
export interface SelectAnchorRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

export interface SelectPopoverPosition {
  left: number;
  width: number;
  maxHeight: number;
  top: number | "auto";
  bottom: number | "auto";
}

const EDGE = 12;
const GAP = 6;
const DEFAULT_MAX_HEIGHT = 260;
const MIN_HEIGHT = 48;
const FLIP_THRESHOLD = 160;

export function selectPopoverPosition(
  anchor: SelectAnchorRect,
  viewportWidth: number,
  viewportHeight: number,
  contentMaxHeight = DEFAULT_MAX_HEIGHT,
): SelectPopoverPosition {
  const width = Math.max(0, Math.min(anchor.width, viewportWidth - EDGE * 2));
  const left = Math.max(EDGE, Math.min(anchor.left, viewportWidth - width - EDGE));
  const maxHeight = Math.max(MIN_HEIGHT, Math.min(contentMaxHeight, viewportHeight - EDGE * 2));
  const roomBelow = viewportHeight - anchor.bottom - EDGE - GAP;
  const roomAbove = anchor.top - EDGE - GAP;
  const openAbove = roomBelow < Math.min(FLIP_THRESHOLD, maxHeight) && roomAbove > roomBelow;
  const available = Math.max(MIN_HEIGHT, Math.min(maxHeight, openAbove ? roomAbove : roomBelow));

  return openAbove
    ? {
        left,
        width,
        maxHeight: available,
        top: "auto",
        bottom: viewportHeight - anchor.top + GAP,
      }
    : {
        left,
        width,
        maxHeight: available,
        top: anchor.bottom + GAP,
        bottom: "auto",
      };
}
