import type { ReactNode } from "react";

import styles from "./DesktopCatalog.module.css";

/** Desktop column (> 768px): hero card, rows card, section cards. Hidden by CSS on mobile. */
export function DesktopCatalog({ children }: { children: ReactNode }) {
  return <div className={styles.view}>{children}</div>;
}
