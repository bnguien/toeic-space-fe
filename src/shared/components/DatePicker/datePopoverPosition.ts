/** Viewport placement of the single-date popover (fixed so dialog overflow never clips it). */
export interface DateAnchorRect {
  top: number;
  bottom: number;
  right: number;
}

export const DATE_POPOVER_WIDTH = 320;
export const DATE_POPOVER_HEIGHT = 352;
const GAP = 8;
const EDGE = 12;
/** Matches `width: min(320px, calc(100vw - 32px))` in DatePicker.module.css. */
const MIN_GUTTER = 32;

export function datePopoverPosition(
  anchor: DateAnchorRect,
  viewportWidth: number,
  viewportHeight: number,
) {
  const width = Math.min(DATE_POPOVER_WIDTH, viewportWidth - MIN_GUTTER);
  const height = DATE_POPOVER_HEIGHT;
  const left = Math.max(EDGE, Math.min(anchor.right - width, viewportWidth - width - EDGE));
  const roomBelow = viewportHeight - anchor.bottom;
  const top =
    roomBelow >= height + EDGE
      ? anchor.bottom + GAP
      : anchor.top >= height + EDGE
        ? anchor.top - height - GAP
        : Math.max(EDGE, Math.min(anchor.bottom + GAP, viewportHeight - height - EDGE));
  return { top, left };
}
