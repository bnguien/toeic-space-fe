import type { ReactNode } from "react";

import styles from "./DictationMapView.module.css";

/** Page frame of the topic-map screen (Studychill `.dc-v2-container.dc-map-view`): hosts the map + modal. */
export function DictationMapView({ children }: { children: ReactNode }) {
  return <div className={styles.view}>{children}</div>;
}
