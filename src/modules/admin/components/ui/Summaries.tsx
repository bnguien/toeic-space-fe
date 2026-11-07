import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import styles from "./summary.module.css";

const value = (amount: number | string | undefined) =>
  amount === undefined ? (
    <span className={styles.skeleton} aria-label="Đang tải" />
  ) : typeof amount === "number" ? (
    amount.toLocaleString("vi-VN")
  ) : (
    amount
  );

export interface HeroStat {
  key: string;
  label: string;
  /** Undefined while loading. */
  value: number | string | undefined;
  /** Draws attention to the figure that needs action. */
  highlight?: boolean;
  to?: string;
}

interface OverviewHeroProps {
  /** Small label above the title, with an optional icon. */
  eyebrow: string;
  icon?: ReactNode;
  /** Title; `highlight` is appended and underlined in the accent colour. */
  title: string;
  highlight?: string;
  /** One short sentence. */
  description?: string;
  actions?: ReactNode;
  /** Large faint word behind the title. */
  watermark: string;
  mascot: string;
  /** Dark side panel: a label, one key sentence and the figures. */
  panelLabel: string;
  panelTitle: ReactNode;
  stats: HeroStat[];
}

/**
 * Header of every overview page: a light card that introduces the section and a dark panel
 * with the figures that matter today.
 */
export function OverviewHero({
  eyebrow,
  icon,
  title,
  highlight,
  description,
  actions,
  watermark,
  mascot,
  panelLabel,
  panelTitle,
  stats,
}: OverviewHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.intro}>
        <span className={styles.watermark} aria-hidden="true">
          {watermark}
        </span>
        <span className={styles.rings} aria-hidden="true" />
        <span className={styles.eyebrow}>
          {icon}
          {eyebrow}
        </span>
        <h1>
          {title}
          {highlight && (
            <>
              {" "}
              <span className={styles.highlight}>{highlight}</span>
            </>
          )}
        </h1>
        {description && <p>{description}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      <div className={styles.panel}>
        <img className={styles.mascot} src={mascot} alt="" width={72} height={72} />
        <span className={styles.panelLabel}>{panelLabel}</span>
        <strong className={styles.panelTitle}>{panelTitle}</strong>
        <dl
          className={styles.panelStats}
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map((stat) => {
            const content = (
              <>
                <dt>{stat.label}</dt>
                <dd data-highlight={stat.highlight ? "true" : undefined}>{value(stat.value)}</dd>
              </>
            );
            return stat.to ? (
              <Link key={stat.key} className={styles.panelStat} to={stat.to}>
                {content}
              </Link>
            ) : (
              <div key={stat.key} className={styles.panelStat}>
                {content}
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

export interface SummaryItem {
  key: string;
  label: string;
  value: number | string | undefined;
  /** Highlighted when the list is filtered by this item. */
  active?: boolean;
  /** Makes the item a quick filter. */
  onSelect?: () => void;
}

interface ListHeroProps {
  eyebrow: string;
  icon?: ReactNode;
  /** Title; `highlight` follows it on a yellow block. */
  title: string;
  highlight?: string;
  /** One short sentence. */
  description?: ReactNode;
  actions?: ReactNode;
  mascot: string;
  /** The three key counts; those with onSelect filter the list below. */
  items: SummaryItem[];
}

/**
 * Header of every list page: a dark banner in the page colour with the title, the main action
 * and three counts that double as quick filters, plus the mascot on a yellow half-moon.
 */
export function ListHero({
  eyebrow,
  icon,
  title,
  highlight,
  description,
  actions,
  mascot,
  items,
}: ListHeroProps) {
  return (
    <section className={styles.listHero}>
      <span className={styles.listRing} aria-hidden="true" />
      <span className={styles.listMoon} aria-hidden="true" />
      <img className={styles.listMascot} src={mascot} alt="" width={140} height={140} />

      <div className={styles.listIntro}>
        <span className={styles.listEyebrow}>
          {icon}
          {eyebrow}
        </span>
        <h1>
          {title}
          {highlight && (
            <>
              {" "}
              <span className={styles.listHighlight}>{highlight}</span>
            </>
          )}
        </h1>
        {description && <p>{description}</p>}
        {actions && <div className={styles.listActions}>{actions}</div>}
      </div>

      <div className={styles.listStats}>
        {items.map((item) => {
          const content = (
            <>
              <strong>{value(item.value)}</strong>
              <span>{item.label}</span>
            </>
          );
          return item.onSelect ? (
            <button
              key={item.key}
              type="button"
              className={styles.listStat}
              aria-pressed={Boolean(item.active)}
              onClick={item.onSelect}
            >
              {content}
            </button>
          ) : (
            <div key={item.key} className={styles.listStat}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
