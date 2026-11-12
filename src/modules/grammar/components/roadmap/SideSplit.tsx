import { ChevronLeft, ChevronRight } from "lucide-react";

import { SIDE_MAX, SIDE_MIN, SPLIT_BUTTON_ATTR, type SidePanel } from "../../hooks/useSidePanel";
import { cx } from "../../utils/cx";
import styles from "./SideSplit.module.css";

/** Divider between the roadmap and the lesson: drag to resize, Enter / button to collapse, double-click to reset. */
export function SideSplit({ panel }: { panel: SidePanel }) {
  const { side, toggle, reset, onPointerDown, onKeyDown, collapsed, dragging } = panel;
  const label = collapsed ? "Mở lộ trình" : "Thu gọn lộ trình";
  return (
    <div
      className={cx(styles.split, collapsed && styles.collapsed, dragging && styles.dragging)}
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để đổi độ rộng lộ trình, Enter để thu gọn"
      aria-valuemin={SIDE_MIN}
      aria-valuemax={SIDE_MAX}
      aria-valuenow={side.collapsed ? 0 : side.width || undefined}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={reset}
    >
      <button
        type="button"
        className={styles.btn}
        onClick={toggle}
        aria-label={label}
        title={label}
        {...{ [SPLIT_BUTTON_ATTR]: "" }}
      >
        {collapsed ? (
          <ChevronRight size={16} strokeWidth={2.6} />
        ) : (
          <ChevronLeft size={16} strokeWidth={2.6} />
        )}
      </button>
    </div>
  );
}
