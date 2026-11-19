import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { Eyebrow } from "../Eyebrow/Eyebrow";
import { cx } from "../types";
import styles from "./PageHeader.module.css";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  /** Small-caps label above the title. */
  eyebrow?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  /** Row under the title, e.g. badges or progress. */
  meta?: ReactNode;
  /** Right-hand block beside the title, e.g. a NumberTile. */
  aside?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  breadcrumb,
  actions,
  meta,
  aside,
  className,
}: PageHeaderProps) {
  return (
    <header className={cx(styles.header, className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className={styles.breadcrumb}>
            {breadcrumb.map((item, index) => (
              <Fragment key={`${item.label}-${index}`}>
                {index > 0 && (
                  <li aria-hidden="true" className={styles.separator}>
                    <ChevronRight size={14} />
                  </li>
                )}
                <li>
                  {item.to ? (
                    <Link to={item.to}>{item.label}</Link>
                  ) : (
                    <span aria-current="page">{item.label}</span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}
      <div className={styles.row}>
        <div className={styles.heading}>
          {eyebrow && <Eyebrow accent>{eyebrow}</Eyebrow>}
          <h1 className={styles.title}>{title}</h1>
          {meta && <div className={styles.meta}>{meta}</div>}
        </div>
        {(aside || actions) && (
          <div className={styles.side}>
            {aside}
            {actions && <div className={styles.actions}>{actions}</div>}
          </div>
        )}
      </div>
    </header>
  );
}
