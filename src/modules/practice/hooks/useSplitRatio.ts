import { useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

import { usePracticePrefsStore } from "../store/practicePrefs.store";
import {
  normalizeDragRatio,
  SPLIT,
  splitBadge,
  stepLeftRatio,
  stepRightRatio,
} from "../utils/splitRatio";

export interface SplitRatio {
  /** Left panel share in % (0 / 100 = one side collapsed). */
  ratio: number;
  dragging: boolean;
  /** "x% : y%" while dragging, else null. */
  badge: string | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  stepLeft: () => void;
  stepRight: () => void;
  /** ⚖ / double-click: back to 50. */
  reset: () => void;
  setRatio: (ratio: number) => void;
  /** Spread on the divider element. */
  handleProps: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
    onDoubleClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  };
}

/**
 * Workspace split pane ratio (persisted). Drag on the divider measures the pointer against
 * `containerRef`; ←/→ on the focused divider step by 5.
 */
export function useSplitRatio(containerRef: RefObject<HTMLElement | null>): SplitRatio {
  const stored = usePracticePrefsStore((s) => s.splitRatio);
  const save = usePracticePrefsStore((s) => s.setSplitRatio);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragging = useRef(false);
  const ratio = dragRatio ?? stored;

  const measure = (clientX: number) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return null;
    return normalizeDragRatio(((clientX - box.left) / box.width) * 100);
  };

  const finish = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragRatio !== null) save(dragRatio);
    setDragRatio(null);
  };

  return {
    ratio,
    dragging: dragRatio !== null,
    badge: dragRatio !== null ? splitBadge(dragRatio) : null,
    leftCollapsed: ratio <= 0,
    rightCollapsed: ratio >= 100,
    stepLeft: () => save(stepLeftRatio(ratio)),
    stepRight: () => save(stepRightRatio(ratio)),
    reset: () => save(SPLIT.center),
    setRatio: save,
    handleProps: {
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragging.current = true;
        setDragRatio(measure(event.clientX) ?? ratio);
      },
      onPointerMove: (event) => {
        if (!dragging.current) return;
        const next = measure(event.clientX);
        if (next !== null) setDragRatio(next);
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onDoubleClick: () => save(SPLIT.center),
      onKeyDown: (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const delta = event.key === "ArrowLeft" ? -5 : 5;
          save(normalizeDragRatio(Math.min(SPLIT.max, Math.max(SPLIT.min, ratio)) + delta));
        } else if (event.key === "Enter" || event.key === "Home") {
          event.preventDefault();
          save(SPLIT.center);
        }
      },
    },
  };
}
