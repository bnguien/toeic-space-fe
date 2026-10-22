import type { ReactNode } from "react";

import styles from "./ui.module.css";

/** "theme" follows the colour family of the page. */
export type Tone = "theme" | "blue" | "rose" | "green" | "pearl" | "neutral";

export function Badge({
  tone = "neutral",
  dot = false,
  title,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span className={styles.badge} data-tone={tone === "neutral" ? undefined : tone} title={title}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}
