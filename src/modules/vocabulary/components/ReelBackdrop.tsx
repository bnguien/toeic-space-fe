import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";

import type { ReelBackgroundDto } from "../types/vocabulary.types";
import styles from "./ReelBackdrop.module.css";

interface ReelBackdropProps {
  backgrounds: ReelBackgroundDto[];
  /** Advances to the next background, e.g. the card position. */
  index: number;
}

interface Layers {
  /** Fully visible video under the incoming one. */
  below: string | null;
  /** Latest video that became playable; fades in over `below`. */
  top: string | null;
}

/**
 * Muted looping background video that cross-fades between clips. Broken URLs are skipped;
 * with no playable clip the frame keeps its plain surface. Reduced motion shows posters only.
 */
export function ReelBackdrop({ backgrounds, index }: ReelBackdropProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const [layers, setLayers] = useState<Layers>({ below: null, top: null });

  const playable = backgrounds.filter((background) => !broken.has(background.id));
  const candidate = playable.length > 0 ? playable[index % playable.length] : undefined;

  const byId = (id: string | null) => backgrounds.find((background) => background.id === id);
  const shown = [byId(layers.below), byId(layers.top), candidate].filter(
    (background, position, list): background is ReelBackgroundDto =>
      !!background &&
      !broken.has(background.id) &&
      list.findIndex((other) => other?.id === background.id) === position,
  );
  const credit = byId(layers.top);

  const handleReady = (id: string) => {
    setLayers((current) => (current.top === id ? current : { below: current.top, top: id }));
  };

  const handleError = (id: string) => {
    setBroken((current) => new Set(current).add(id));
    setLayers((current) => ({
      below: current.below === id ? null : current.below,
      top: current.top === id ? current.below : current.top,
    }));
  };

  return (
    <div className={styles.backdrop} aria-hidden={!credit}>
      {shown.map((background) => {
        const ready = background.id === layers.top || background.id === layers.below;
        const layer = background.id === layers.below ? "below" : "top";
        return reducedMotion ? (
          <img
            key={background.id}
            className={styles.media}
            data-ready={ready || undefined}
            data-layer={layer}
            src={background.posterUrl}
            alt=""
            onLoad={() => handleReady(background.id)}
            onError={() => handleError(background.id)}
          />
        ) : (
          <video
            key={background.id}
            className={styles.media}
            data-ready={ready || undefined}
            data-layer={layer}
            src={background.videoUrl}
            poster={background.posterUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => handleReady(background.id)}
            onError={() => handleError(background.id)}
          />
        );
      })}
      {credit && <div className={styles.scrim} />}
      {credit && (
        <a className={styles.credit} href={credit.pageUrl} target="_blank" rel="noreferrer">
          {credit.author}
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
