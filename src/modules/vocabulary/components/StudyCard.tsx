import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/shared/components/ui";

import type { CardStyle } from "../types/vocabulary.types";
import type { CardTheme } from "../utils/card-themes";
import type { StageTone } from "../utils/stage-tones";
import styles from "./StudyCard.module.css";

export type CardVerdict = "correct" | "wrong";

interface StudyCardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  theme: CardTheme;
  cardStyle: CardStyle;
  /** Answer outcome: green or rose ring. */
  verdict?: CardVerdict | null;
  /** Short shake (wrong answer). */
  shake?: boolean;
  /** Chips row on top (POS, CEFR…). */
  head?: ReactNode;
  /** Pinned to the bottom of the card. */
  foot?: ReactNode;
  children: ReactNode;
}

/**
 * The coloured study card. Colour and edge pattern come from the word's theme; the card style
 * (stage fills, pastel, night) only changes how the hue is drawn. Children read `--card-*`.
 */
export function StudyCard({
  theme,
  cardStyle,
  verdict = null,
  shake = false,
  head,
  foot,
  className,
  children,
  ...props
}: StudyCardProps) {
  return (
    <article
      className={cx(styles.tone, styles.card, className)}
      data-style={cardStyle}
      data-hue={theme.hue}
      data-pattern={theme.pattern}
      data-verdict={verdict ?? undefined}
      data-shake={shake || undefined}
      {...props}
    >
      {head && <div className={styles.head}>{head}</div>}
      <div className={styles.body}>{children}</div>
      {foot && <div className={styles.foot}>{foot}</div>}
    </article>
  );
}

/** Small chip on a study card. */
export function CardChip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span className={styles.chip} data-strong={strong || undefined}>
      {children}
    </span>
  );
}

/** One hue of a card style, e.g. in a style picker strip. */
export function CardSwatch({ cardStyle, hue }: { cardStyle: CardStyle; hue: StageTone }) {
  return <i className={cx(styles.tone, styles.swatch)} data-style={cardStyle} data-hue={hue} />;
}
