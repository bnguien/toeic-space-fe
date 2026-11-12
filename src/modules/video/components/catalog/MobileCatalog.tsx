import type { ReactNode } from "react";

import styles from "./MobileCatalog.module.css";

/** Mobile column (≤ 768px): "Tạo video song ngữ" button, rows, row-style lists. Hidden by CSS on desktop. */
export function MobileCatalog({ children }: { children: ReactNode }) {
  return <div className={styles.view}>{children}</div>;
}
