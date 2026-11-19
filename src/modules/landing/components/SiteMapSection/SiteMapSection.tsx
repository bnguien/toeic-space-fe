import { useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { HOME_MAP, type HomeMapCard } from "../../utils/homeMap";
import { HomeMapDialog } from "../HomeMapDialog/HomeMapDialog";
import { HOME_MAP_ART } from "./homeMapArt";
import styles from "./SiteMapSection.module.css";

/** Plain left click opens the popup; Ctrl/Cmd/Shift/middle click keep opening the link itself. */
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/**
 * Home section 2 "Bản đồ TOEICSpace" (StudyChill HomeMap): five ticket tiles; a click opens the
 * tile's popup with its Parts or games instead of navigating.
 */
export function SiteMapSection() {
  const [open, setOpen] = useState<HomeMapCard | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const pick = (card: HomeMapCard) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!plainClick(event)) return;
    event.preventDefault();
    opener.current = event.currentTarget;
    setOpen(card);
  };
  const close = () => {
    setOpen(null);
    const el = opener.current;
    if (el?.isConnected) window.setTimeout(() => el.focus({ preventScroll: true }), 0);
  };

  return (
    <div className={styles.band}>
      <i className={`${styles.tri} ${styles.triTop}`} aria-hidden="true" />
      <i className={`${styles.tri} ${styles.triBottom}`} aria-hidden="true" />
      <section id="ban-do" className={styles.section} aria-labelledby="ban-do-title">
        <h2 id="ban-do-title" className={styles.title}>
          Bản đồ <span>TOEICSpace</span>
        </h2>

        <div className={styles.main}>
          {HOME_MAP.map((card) => (
            <Link
              key={card.key}
              to={card.to}
              className={styles.ticket}
              aria-haspopup="dialog"
              onClick={pick(card)}
            >
              <span className={styles.holes} aria-hidden="true">
                <i />
                <i />
              </span>
              <span className={styles.ticketArt}>
                <img
                  src={HOME_MAP_ART[card.art]}
                  alt=""
                  width={150}
                  height={150}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className={styles.ticketBody}>
                <b>{card.title}</b>
                <small>{card.sub}</small>
              </span>
              <span className={styles.arrow} aria-hidden="true">
                <ArrowRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      {open && <HomeMapDialog key={open.key} card={open} onClose={close} />}
    </div>
  );
}
