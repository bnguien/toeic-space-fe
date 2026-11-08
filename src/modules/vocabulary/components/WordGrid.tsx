import type { ReactNode } from "react";

import { Skeleton } from "@/shared/components/ui";

import styles from "./WordGrid.module.css";

interface WordGridProps {
  label: string;
  /** `<li>` items, one `WordTile` each. */
  children: ReactNode;
  /** Previous results shown while the next page loads. */
  stale?: boolean;
}

/** Word tiles in 3 columns, 2 in a narrower main column, 1 on phones. */
export function WordGrid({ label, children, stale = false }: WordGridProps) {
  return (
    <div className={styles.frame}>
      <ul className={styles.grid} aria-label={label} data-stale={stale || undefined}>
        {children}
      </ul>
    </div>
  );
}

/** Loading placeholder with the grid's shape. */
export function WordGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.frame}>
      <div className={styles.grid} aria-busy="true">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} shape="block" height={132} />
        ))}
      </div>
    </div>
  );
}
