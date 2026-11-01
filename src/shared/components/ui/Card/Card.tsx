import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "../types";
import styles from "./Card.module.css";

export type CardPadding = "none" | "sm" | "md" | "lg";

/**
 * surface: plain white card; paper: cream with ink outline and hard shadow;
 * outline: white with ink outline and hard shadow; panel: navy with light text.
 */
export type CardVariant = "surface" | "paper" | "outline" | "panel";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "li";
  variant?: CardVariant;
  padding?: CardPadding;
  /** Hover/focus affordance for clickable cards. */
  interactive?: boolean;
  /** Emphasised border, e.g. the selected or recommended item. */
  highlighted?: boolean;
  children?: ReactNode;
}

export function Card({
  as: Element = "div",
  variant = "surface",
  padding = "md",
  interactive = false,
  highlighted = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Element
      className={cx(styles.card, className)}
      data-variant={variant}
      data-padding={padding}
      data-interactive={interactive || undefined}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      {children}
    </Element>
  );
}
