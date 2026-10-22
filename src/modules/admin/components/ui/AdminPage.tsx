import type { ReactNode } from "react";

import styles from "./ui.module.css";

export type PageTheme = "blue" | "amber" | "rose";

type AdminPageProps = { theme?: PageTheme } & (
  | {
      eyebrow?: string;
      title: ReactNode;
      description?: ReactNode;
      actions?: ReactNode;
      hero?: never;
      children: ReactNode;
    }
  | {
      /** Overview pages replace the plain header with an OverviewHero banner. */
      hero: ReactNode;
      eyebrow?: never;
      title?: never;
      description?: never;
      actions?: never;
      children: ReactNode;
    }
);

/** Common frame of every admin page, so headings and spacing match across sections. */
export function AdminPage({
  eyebrow,
  title,
  description,
  actions,
  hero,
  theme = "blue",
  children,
}: AdminPageProps) {
  if (hero) {
    return (
      <div className={styles.page} data-theme={theme}>
        {hero}
        {children}
      </div>
    );
  }

  return (
    <div className={styles.page} data-theme={theme}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className={styles.pageActions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({
  title,
  description,
  action,
  span,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  span?: "full";
  children: ReactNode;
}) {
  return (
    <section className={styles.card} data-span={span}>
      {(title || action) && (
        <div className={styles.cardHeader}>
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function CardGrid({ layout, children }: { layout?: "wide-left"; children: ReactNode }) {
  return (
    <div className={styles.cardGrid} data-layout={layout}>
      {children}
    </div>
  );
}
