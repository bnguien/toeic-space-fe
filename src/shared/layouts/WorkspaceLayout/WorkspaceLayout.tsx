import { useEffect, type CSSProperties, type ReactNode } from "react";

import { ResizeHandle } from "@/shared/components/ui";
import { useColorModeScope } from "@/shared/hooks/useColorMode";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { useResizable } from "@/shared/hooks/useResizable";

import styles from "./WorkspaceLayout.module.css";

export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 420;
export const SIDEBAR_DEFAULT = 272;
const RAIL_WIDTH = 64;
/** Below this width the sidebar stacks above the main column (see the CSS). */
const STACKED_QUERY = "(max-width: 960px)";

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
 * Workspace under the fixed navbar: main column + a sidebar pinned to the right edge
 * (from the navbar to the bottom of the viewport, border-left only), drag-resizable from its
 * left edge. Follows the light/dark colour mode.
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

  useColorModeScope();
  const stacked = useMediaQuery(STACKED_QUERY);
  const sidebarPx = collapsed ? RAIL_WIDTH : resizable.width;

  // Floating page elements (back to top, toasts) sit left of the pinned sidebar.
  useEffect(() => {
    if (stacked) return;
    const root = document.documentElement.style;
    root.setProperty("--back-to-top-right", `${sidebarPx + 24}px`);
    root.setProperty("--toast-right", `${sidebarPx + 16}px`);
    return () => {
      root.removeProperty("--back-to-top-right");
      root.removeProperty("--toast-right");
    };
  }, [stacked, sidebarPx]);

  const style = { "--sidebar-w": `${sidebarPx}px` } as CSSProperties;

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
    </div>
  );
}
