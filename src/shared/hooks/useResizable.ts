import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface ResizableOptions {
  /** Committed width (px). */
  width: number;
  min: number;
  max: number;
  /** Width restored by a double-click. */
  defaultWidth: number;
  /** Called once a drag or key press ends with a new width. */
  onCommit: (width: number) => void;
  /** Called when the panel is dragged (or stepped) below `min`. */
  onCollapse?: () => void;
  /** Which edge the handle sits on; a left-edge handle grows the panel when moved left. */
  edge?: "left" | "right";
  /** Keyboard step (px). */
  step?: number;
  /** How far below `min` a drag must go before it collapses. */
  snap?: number;
}

/**
 * Pointer + keyboard resizing for a side panel. The live width during a drag is local state
 * set from the event handlers; the caller only stores the committed value.
 */
export function useResizable({
  width,
  min,
  max,
  defaultWidth,
  onCommit,
  onCollapse,
  edge = "left",
  step = 16,
  snap = 48,
}: ResizableOptions) {
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const drag = useRef<{ x: number; width: number; raw: number } | null>(null);

  const clamp = (value: number) => Math.min(max, Math.max(min, Math.round(value)));
  const current = dragWidth ?? clamp(width);
  const direction = edge === "left" ? -1 : 1;

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width: current, raw: current };
    setDragWidth(current);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state) return;
    state.raw = state.width + direction * (event.clientX - state.x);
    setDragWidth(clamp(state.raw));
  };

  const finish = () => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    setDragWidth(null);
    if (onCollapse && state.raw < min - snap) onCollapse();
    else if (clamp(state.raw) !== clamp(width)) onCommit(clamp(state.raw));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const grow = edge === "left" ? "ArrowLeft" : "ArrowRight";
    const shrink = edge === "left" ? "ArrowRight" : "ArrowLeft";
    if (event.key === grow) {
      event.preventDefault();
      onCommit(clamp(current + step));
    } else if (event.key === shrink) {
      event.preventDefault();
      if (onCollapse && current - step < min) onCollapse();
      else onCommit(clamp(current - step));
    }
  };

  return {
    width: current,
    dragging: dragWidth !== null,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onKeyDown,
      onDoubleClick: () => onCommit(clamp(defaultWidth)),
    },
  };
}
