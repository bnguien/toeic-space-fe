import type { ReactNode } from "react";

import { cx } from "../types";
import styles from "./PageContainer.module.css";

export type PageWidth = "default" | "narrow" | "focus";

export interface PageContainerProps {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}

/** Learner page frame: centred column below the fixed navbar. */
export function PageContainer({ width = "default", className, children }: PageContainerProps) {
  return (
    <main className={cx(styles.page, className)} data-width={width}>
      {children}
    </main>
  );
}
