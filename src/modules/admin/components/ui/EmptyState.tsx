import type { ReactNode } from "react";

import emptyImage from "@/assets/mascot/oy2-empty.png";
import styles from "./ui.module.css";

export function EmptyState({
  title,
  description,
  action,
  image = true,
  framed = false,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  image?: boolean;
  /** Dashed frame for use outside a card. */
  framed?: boolean;
}) {
  return (
    <div className={`${styles.empty} ${framed ? styles.emptyCard : ""}`} role="status">
      {image && <img src={emptyImage} alt="" />}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
