import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";

import { useCurrentUser } from "@/modules/auth";

import {
  PANEL_GROUP_KEYS,
  SITE_MAP,
  SITE_MAP_MAIN,
  countItems,
  currentItem,
  visibleGroups,
} from "../../utils/siteMap";
import styles from "./SiteMapPanel.module.css";

const NAV = "a[data-map-link]";

/**
 * "Bản đồ" (StudyChill FeatureMap / "Chillo có gì" panel): two columns of numbered features and the
 * row of main entries below. Native modal <dialog>: focus trap, Esc and the backdrop close it;
 * ↑/↓ (and Home/End) move between links.
 */
export function SiteMapPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const user = useCurrentUser();
  const { pathname, search } = useLocation();

  const groups = useMemo(
    () =>
      visibleGroups(
        SITE_MAP.filter((group) => PANEL_GROUP_KEYS.includes(group.key)),
        user?.role ?? null,
      ),
    [user?.role],
  );
  const current = currentItem(SITE_MAP, pathname, search);
  const currentPath = `${pathname}${search}`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  const moveFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    const links = [...(ref.current?.querySelectorAll<HTMLAnchorElement>(NAV) ?? [])];
    if (!links.length) return;
    const index = links.indexOf(event.target as HTMLAnchorElement);
    const go = (i: number) => {
      event.preventDefault();
      links[(i + links.length) % links.length].focus();
    };
    if (event.key === "ArrowDown") go(index < 0 ? 0 : index + 1);
    else if (event.key === "ArrowUp") go(index < 0 ? links.length - 1 : index - 1);
    else if (event.key === "Home" && index >= 0) go(0);
    else if (event.key === "End" && index >= 0) go(links.length - 1);
  };

  // Running numbers across both columns (01, 02, …).
  const offsets = groups.map((_, i) =>
    groups.slice(0, i).reduce((sum, group) => sum + group.items.length, 0),
  );

  return (
    <dialog
      ref={ref}
      className={styles.panel}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={moveFocus}
    >
      <div className={styles.frame}>
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            Bản đồ TOEICSpace
            <span>{countItems(groups) + SITE_MAP_MAIN.length} mục</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Đóng"
          >
            <kbd>ESC</kbd>
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.columns}>
          {groups.map((group, groupIndex) => (
            <section key={group.key} className={styles.column} aria-labelledby={`map-${group.key}`}>
              <h3 id={`map-${group.key}`} className={styles.columnTitle}>
                {group.title}
              </h3>
              <ol className={styles.list}>
                {group.items.map((item, itemIndex) => {
                  const number = offsets[groupIndex] + itemIndex + 1;
                  const isCurrent = current?.key === item.key;
                  return (
                    <li key={item.key}>
                      <Link
                        to={item.to}
                        className={styles.item}
                        data-map-link=""
                        aria-current={isCurrent ? "page" : undefined}
                        onClick={onClose}
                      >
                        <span className={styles.num} aria-hidden="true">
                          {String(number).padStart(2, "0")}
                        </span>
                        <span className={styles.name}>{item.title}</span>
                        {isCurrent ? (
                          <span className={styles.meta} data-here="">
                            Đang xem
                          </span>
                        ) : (
                          item.tag && <span className={styles.meta}>{item.tag}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <nav className={styles.main} aria-label="Lối vào chính">
          {SITE_MAP_MAIN.map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className={styles.big}
              data-map-link=""
              aria-current={currentPath === entry.to || pathname === entry.to ? "page" : undefined}
              onClick={onClose}
            >
              <b>{entry.title}</b>
              <small>{entry.subtitle}</small>
              <ArrowRight size={16} className={styles.bigArrow} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
    </dialog>
  );
}
