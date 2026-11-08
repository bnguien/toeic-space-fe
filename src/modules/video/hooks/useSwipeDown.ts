import { useCallback, useRef, type TouchEvent } from "react";

/**
 * Swipe down to close a bottom sheet.
 *
 * Spread `dragProps` on the grab area (handle + title), NOT on the scrollable content — otherwise scrolling the
 * content drags the sheet. `sheetRef` is the sheet itself; it follows the finger while dragging.
 * Releasing beyond `threshold` px (or a fast flick) closes, otherwise it springs back.
 */
export function useSwipeDown<T extends HTMLElement = HTMLElement>(
  onClose: () => void,
  threshold = 90,
) {
  const sheetRef = useRef<T | null>(null);
  const dragRef = useRef<{ y: number; dy: number; at: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    dragRef.current = { y: t.clientY, dy: 0, at: Date.now() };
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const drag = dragRef.current;
    const t = e.touches && e.touches[0];
    if (!drag || !t) return;
    drag.dy = Math.max(0, t.clientY - drag.y);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${drag.dy}px)`;
  }, []);

  const onTouchEnd = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "";
      el.style.transform = "";
    }
    if (!drag) return;
    const velocity = drag.dy / Math.max(1, Date.now() - drag.at); // px/ms
    if (drag.dy > threshold || (drag.dy > 30 && velocity > 0.6)) onClose();
  }, [threshold, onClose]);

  return {
    sheetRef,
    dragProps: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
