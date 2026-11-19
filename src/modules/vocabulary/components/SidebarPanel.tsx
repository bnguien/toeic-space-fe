import type { ReactNode } from "react";

import styles from "./SidebarPanel.module.css";

interface SidebarPanelProps {
  children: ReactNode;
  /** One compact row pinned to the bottom. */
  toolbar: ReactNode;
}

/** Content of the flush workspace sidebar: scrollable list + bottom toolbar row. */
export function SidebarPanel({ children, toolbar }: SidebarPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.body}>{children}</div>
      <div className={styles.toolbar}>{toolbar}</div>
    </div>
  );
}
