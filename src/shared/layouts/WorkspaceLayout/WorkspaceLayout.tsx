import type { CSSProperties, ReactNode } from "react";

import { ResizeHandle, ToastViewport } from "@/shared/components/ui";
import { useResizable } from "@/shared/hooks/useResizable";

import styles from "./WorkspaceLayout.module.css";

export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 420;
export const SIDEBAR_DEFAULT = 272;

export interface WorkspaceLayoutProps {
  /** Main column. */
  children: ReactNode;
  /** Right sidebar content when expanded. */
  sidebar: ReactNode;
  /** Narrow rail content when collapsed. */
  rail?: ReactNode;
  collapsed?: boolean;
  /** Expanded sidebar width (px). */
  sidebarWidth?: number;
  onSidebarResize?: (width: number) => void;
  /** Dragging below the minimum width collapses the sidebar. */
  onCollapse?: () => void;
  /** Multiplier applied to the main column's type scale. */
  fontScale?: number;
}

/**
 * Workspace under the fixed navbar: main column + a sidebar flush against the right edge
 * (full height, sticky, border-left only), drag-resizable from its left edge.
 */
export function WorkspaceLayout({
  children,
  sidebar,
  rail,
  collapsed = false,
  sidebarWidth = SIDEBAR_DEFAULT,
  onSidebarResize,
  onCollapse,
  fontScale = 1,
}: WorkspaceLayoutProps) {
  const resizable = useResizable({
    width: sidebarWidth,
    min: SIDEBAR_MIN,
    max: SIDEBAR_MAX,
    defaultWidth: SIDEBAR_DEFAULT,
    onCommit: (width) => onSidebarResize?.(width),
    onCollapse,
  });

  const style = {
    "--sidebar-w": collapsed ? "64px" : `${resizable.width}px`,
  } as CSSProperties;

  return (
    <div
      className={styles.workspace}
      style={style}
      data-collapsed={collapsed || undefined}
      data-resizing={resizable.dragging || undefined}
    >
      <div className={styles.backdrop} aria-hidden="true" />
      <main className={styles.main} style={{ "--font-scale": fontScale } as CSSProperties}>
        <div className={styles.inner}>{children}</div>
      </main>
      <aside className={styles.aside}>
        {!collapsed && onSidebarResize && (
          <ResizeHandle
            className={styles.handle}
            label="Đổi độ rộng thanh bên"
            value={resizable.width}
            min={SIDEBAR_MIN}
            max={SIDEBAR_MAX}
            dragging={resizable.dragging}
            {...resizable.handleProps}
          />
        )}
        {collapsed ? (rail ?? sidebar) : sidebar}
      </aside>
      <ToastViewport />
    </div>
  );
}
