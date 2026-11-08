import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";

import type { ReelBackgroundDto, StudyBackdropKind } from "../types/vocabulary.types";
import styles from "./StudyBackdrop.module.css";

interface StudyBackdropProps {
  kind: StudyBackdropKind;
  backgrounds: ReelBackgroundDto[];
  /** Scene number; a new value cross-fades to another clip. */
  scene: number;
}

interface Layers {
  /** Fully visible clip under the incoming one. */
  below: string | null;
  /** Latest clip that became playable; fades in over `below`. */
  top: string | null;
}

/**
 * Full-viewport layer behind a study session: a muted looping nature clip that cross-fades
 * between scenes under a dim scrim, or a soft ambient wash of the app colours. Broken clips are
 * skipped; with none playable the ambient wash shows. Reduced motion shows still posters.
 */
export function StudyBackdrop({ kind, backgrounds, scene }: StudyBackdropProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const [layers, setLayers] = useState<Layers>({ below: null, top: null });

  const playable =
    kind === "video" ? backgrounds.filter((background) => !broken.has(background.id)) : [];
  const candidate = playable.length > 0 ? playable[scene % playable.length] : undefined;

  const byId = (id: string | null) => playable.find((background) => background.id === id);
  const shown = [byId(layers.below), byId(layers.top), candidate].filter(
    (background, position, list): background is ReelBackgroundDto =>
      !!background && list.findIndex((other) => other?.id === background.id) === position,
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
    <div className={styles.backdrop} data-video={credit ? true : undefined}>
      <div className={styles.ambient} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
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
            aria-hidden="true"
            onCanPlay={() => handleReady(background.id)}
            onError={() => handleError(background.id)}
          />
        );
      })}
      {credit && <div className={styles.scrim} aria-hidden="true" />}
      {credit && (
        <a className={styles.credit} href={credit.pageUrl} target="_blank" rel="noreferrer">
          {credit.author}
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
