import { Play } from "lucide-react";

import determinedMascot from "@/assets/mascot/oy2-determined.png";
import listeningMascot from "@/assets/mascot/oy2-listening.png";
import readingMascot from "@/assets/mascot/oy2-reading.png";

import styles from "./HeroArt.module.css";

export type HeroArtKind = "exam" | "listening" | "reading";

const ART: Record<HeroArtKind, { src: string; caption: string }> = {
  exam: { src: determinedMascot, caption: "Thi thử 200 câu" },
  listening: { src: listeningMascot, caption: "Part 1 → Part 4" },
  reading: { src: readingMascot, caption: "Part 5 → Part 7" },
};

/**
 * Tilted photo card of the overview (TOEIC vocabulary hero) with one accessory per mode:
 * exam = "200 câu" stamp + answer bubbles, listening = mini player, reading = note with keywords.
 * Static on purpose: no looping decoration.
 */
export function HeroArt({ kind }: { kind: HeroArtKind }) {
  const art = ART[kind];
  return (
    <div className={styles.art} data-kind={kind} aria-hidden="true">
      {kind === "reading" && <span className={styles.clip} />}
      <figure className={styles.polaroid}>
        <span className={styles.photo}>
          <img src={art.src} alt="" width={180} height={180} decoding="async" />
        </span>
        <figcaption className={styles.caption}>{art.caption}</figcaption>
      </figure>
      {kind === "exam" && (
        <>
          <span className={styles.stamp}>
            <b>200</b>
            <small>câu</small>
          </span>
          <ol className={styles.bubbles}>
            {["A", "B", "C", "D"].map((key) => (
              <li key={key} data-on={key === "C" || undefined}>
                {key}
              </li>
            ))}
          </ol>
        </>
      )}
      {kind === "listening" && (
        <span className={styles.player}>
          <b>
            <Play size={12} fill="currentColor" />
          </b>
          <span className={styles.wave}>
            {[40, 70, 52, 88, 60, 95, 48, 76, 58, 84, 44, 66].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} data-lit={i < 7 || undefined} />
            ))}
          </span>
          <small>0:42</small>
        </span>
      )}
      {kind === "reading" && (
        <span className={styles.sheet}>
          <i />
          <i />
          <mark>skim · scan</mark>
          <i />
        </span>
      )}
    </div>
  );
}
