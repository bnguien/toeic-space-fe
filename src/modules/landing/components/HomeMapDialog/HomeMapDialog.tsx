import { useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star, X } from "lucide-react";

import { useCurrentUser } from "@/modules/auth";

import { entriesFor, type HomeMapCard, type HomeMapEntry } from "../../utils/homeMap";
import { HOME_MAP_ART } from "../SiteMapSection/homeMapArt";
import styles from "./HomeMapDialog.module.css";

const PEEK_W = 320;
const PEEK_H = 250;

interface Peek {
  item: HomeMapEntry;
  top: number;
  /** Beside the dialog (wide screens) or in place of the mascot (narrow ones). */
  side: boolean;
}

/** Preview of an entry: the Part number or the game name, with its longer text. */
function PeekCard({ item }: { item: HomeMapEntry }) {
  return (
    <div className={styles.peekCard}>
      {item.num ? (
        <span className={styles.peekPart}>
          <small>Part</small>
          {item.num}
        </span>
      ) : (
        <span className={styles.peekGame} aria-hidden="true">
          {item.hot ? <Star size={28} fill="currentColor" /> : <ArrowRight size={28} />}
        </span>
      )}
      <b>{item.name}</b>
      {item.desc && <p>{item.desc}</p>}
    </div>
  );
}

/**
 * Popup of a home-map tile (StudyChill HomeMapDialog): mascot on the left, short description, the
 * area's Parts or games and the main button on the right. Hovering / focusing an entry slides a
 * preview next to the dialog. Native modal <dialog>: focus trap; ✕, backdrop and Esc close it.
 */
export function HomeMapDialog({ card, onClose }: { card: HomeMapCard; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const user = useCurrentUser();
  const [peek, setPeek] = useState<Peek | null>(null);
  const items = entriesFor(card, user?.role ?? null);
  const { info } = card;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    ctaRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const showPeek = (item: HomeMapEntry) => (event: PointerEvent | FocusEvent) => {
    const stage = stageRef.current;
    if (!stage) return;
    const s = stage.getBoundingClientRect();
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const side = window.innerWidth - s.right >= PEEK_W + 28;
    const top = Math.max(0, Math.min(r.top + r.height / 2 - s.top - PEEK_H / 2, s.height - PEEK_H));
    setPeek({ item, top, side });
  };
  const hidePeek = () => setPeek(null);
  const inArt = peek && !peek.side ? peek.item : null;

  return (
    <dialog
      ref={ref}
      className={styles.backdrop}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.stage} ref={stageRef} data-short={!items.length || undefined}>
        <div className={styles.dialog}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
            <X size={18} aria-hidden="true" />
          </button>

          <div className={styles.art} data-peek={inArt ? "" : undefined} aria-hidden="true">
            {inArt ? (
              <PeekCard item={inArt} />
            ) : (
              <img src={HOME_MAP_ART[card.art]} alt="" width={230} height={230} decoding="async" />
            )}
          </div>

          <div className={styles.body}>
            <span className={styles.kicker}>Bản đồ TOEICSpace</span>
            <h2 id={titleId}>{card.title}</h2>
            <p className={styles.desc}>{info.desc}</p>

            {items.length > 0 && (
              <ul className={styles.list} onPointerLeave={hidePeek}>
                {items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={styles.item}
                      data-hot={item.hot || undefined}
                      onClick={onClose}
                      onPointerEnter={showPeek(item)}
                      onFocus={showPeek(item)}
                      onBlur={hidePeek}
                    >
                      {info.kind === "parts" ? (
                        <span className={styles.partNum}>{item.num}</span>
                      ) : (
                        <span className={styles.mark} aria-hidden="true">
                          {item.hot ? <Star size={15} fill="currentColor" /> : <i />}
                        </span>
                      )}
                      <span className={styles.itemText}>
                        <b>{item.name}</b>
                        <small>{item.sub}</small>
                      </span>
                      {item.hot && <span className={styles.srOnly}> (nổi bật)</span>}
                      <ArrowRight size={16} className={styles.go} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link ref={ctaRef} to={info.ctaTo ?? card.to} className={styles.cta} onClick={onClose}>
              {info.cta}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
        {peek?.side && (
          <aside
            key={peek.item.to}
            className={styles.peek}
            style={{ top: peek.top }}
            aria-hidden="true"
          >
            <PeekCard item={peek.item} />
          </aside>
        )}
      </div>
    </dialog>
  );
}
