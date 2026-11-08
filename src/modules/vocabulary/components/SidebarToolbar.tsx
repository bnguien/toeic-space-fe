import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { IconButton, Segmented } from "@/shared/components/ui";

import styles from "./SidebarToolbar.module.css";

export type WorkspaceView = "roadmap" | "library";

const VIEW_OPTIONS = [
  { value: "roadmap", label: "Bộ từ vựng" },
  { value: "library", label: "Của tôi" },
] as const;

interface SidebarToolbarProps {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  font: {
    canDecrease: boolean;
    canIncrease: boolean;
    decrease: () => void;
    increase: () => void;
  };
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** One compact row: view switch · A− A+ · collapse. */
export function SidebarToolbar({
  view,
  onViewChange,
  font,
  collapsed,
  onToggleCollapsed,
}: SidebarToolbarProps) {
  if (collapsed) {
    return (
      <IconButton label="Mở thanh bên" variant="outline" size="sm" onClick={onToggleCollapsed}>
        <PanelRightOpen size={16} />
      </IconButton>
    );
  }

  return (
    <div className={styles.toolbar}>
      <Segmented
        label="Nguồn từ vựng"
        size="sm"
        value={view}
        onChange={onViewChange}
        options={VIEW_OPTIONS}
        className={styles.views}
      />
      <IconButton
        label="Giảm cỡ chữ"
        size="sm"
        disabled={!font.canDecrease}
        onClick={font.decrease}
      >
        <span className={styles.glyph}>A−</span>
      </IconButton>
      <IconButton
        label="Tăng cỡ chữ"
        size="sm"
        disabled={!font.canIncrease}
        onClick={font.increase}
      >
        <span className={styles.glyph}>A+</span>
      </IconButton>
      <IconButton label="Thu gọn" size="sm" onClick={onToggleCollapsed}>
        <PanelRightClose size={16} />
      </IconButton>
    </div>
  );
}
