import { useMemo, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { Gauge, LoaderCircle, Pause, Play, RotateCcw } from "lucide-react";

import { IconButton, Kbd, cx } from "@/shared/components/ui";
import { usePopover } from "@/shared/hooks/usePopover";

import { PLAYER_RATES, type AudioPlayer } from "../../hooks/useAudioPlayer";
import { formatClock } from "../../utils/scoreDisplay";
import styles from "./PracticeAudioPlayer.module.css";

const BAR_COUNT = 80;

/** Stable pseudo-waveform heights (0.25..1) seeded by the source. */
function waveformBars(seed: string, count = BAR_COUNT): number[] {
  let hash = 2166136261;
  for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return Array.from({ length: count }, (_, i) => {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
    const wave = 0.55 + 0.35 * Math.sin(i / 4.2) * Math.cos(i / 9.7);
    return Math.min(1, Math.max(0.25, wave * (0.7 + (hash % 1000) / 1600)));
  });
}

export interface PracticeAudioPlayerProps {
  /** State and actions from `useAudioPlayer(src, …)`. */
  player: AudioPlayer;
  /** Seed of the waveform (the audio URL). */
  seed: string;
  /** Desktop hint row: Space · Shift+← · 1–4 · ←/→. */
  showShortcuts?: boolean;
  /** Sticky compact layout (mobile). */
  compact?: boolean;
  className?: string;
}

/**
 * Practice audio player (port of the StudyChill workspace player): play/pause, "↺ 3s",
 * a clickable ~80-bar waveform seek bar, time, speed menu 0.75–1.5× and shortcut hints.
 * Keyboard shortcuts are wired by the page (`useHotkeys`), not here.
 */
export function PracticeAudioPlayer({
  player,
  seed,
  showShortcuts = false,
  compact = false,
  className,
}: PracticeAudioPlayerProps) {
  const bars = useMemo(() => waveformBars(seed), [seed]);
  const {
    open: speedOpen,
    toggle: toggleSpeed,
    close: closeSpeed,
    anchorRef: speedAnchor,
    triggerRef: speedTrigger,
  } = usePopover();
  const progress = player.duration > 0 ? Math.min(1, player.currentTime / player.duration) : 0;
  const filled = Math.round(progress * bars.length);

  const seekFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width > 0)
      player.seekRatio(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
  };
  const seekFromKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      player.seek(player.currentTime + (event.key === "ArrowLeft" ? -5 : 5));
    } else if (event.key === "Home") {
      event.preventDefault();
      player.seek(0);
    }
  };

  return (
    <div
      className={cx(styles.player, className)}
      data-compact={compact || undefined}
      data-no-lookup="true"
    >
      <div className={styles.row}>
        <IconButton
          label={player.playing ? "Tạm dừng" : "Phát"}
          variant="primary"
          round
          className={styles.play}
          data-blocked={player.blocked || undefined}
          onClick={player.toggle}
          disabled={player.failed}
        >
          {player.loading && !player.playing ? (
            <LoaderCircle size={18} className={styles.spin} aria-hidden="true" />
          ) : player.playing ? (
            <Pause size={18} aria-hidden="true" />
          ) : (
            <Play size={18} aria-hidden="true" />
          )}
        </IconButton>
        <button
          type="button"
          className={styles.back}
          onClick={() => player.back()}
          aria-label="Tua lại 3 giây"
          disabled={player.failed}
        >
          <RotateCcw size={14} aria-hidden="true" />
          3s
        </button>
        <div
          className={styles.wave}
          role="slider"
          tabIndex={0}
          aria-label="Vị trí audio"
          aria-valuemin={0}
          aria-valuemax={Math.round(player.duration)}
          aria-valuenow={Math.round(player.currentTime)}
          aria-valuetext={`${formatClock(player.currentTime)} / ${formatClock(player.duration)}`}
          onClick={seekFromPointer}
          onKeyDown={seekFromKeys}
          style={{ "--progress": `${progress * 100}%` } as CSSProperties}
        >
          {bars.map((height, i) => (
            <span
              key={i}
              className={styles.bar}
              data-played={i < filled || undefined}
              style={{ "--h": height } as CSSProperties}
            />
          ))}
          <span className={styles.track} aria-hidden="true" />
        </div>
        <span className={styles.time}>
          {formatClock(player.currentTime)} / {formatClock(player.duration)}
        </span>
        <div className={styles.speed} ref={speedAnchor}>
          <button
            ref={speedTrigger}
            type="button"
            className={styles.speedButton}
            aria-haspopup="menu"
            aria-expanded={speedOpen}
            aria-label={`Tốc độ ${player.rate}×`}
            onClick={toggleSpeed}
          >
            <Gauge size={14} aria-hidden="true" />
            {player.rate}×
          </button>
          {speedOpen && (
            <ul className={styles.speedMenu} role="menu" aria-label="Tốc độ phát">
              {PLAYER_RATES.map((rate) => (
                <li key={rate} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={player.rate === rate}
                    onClick={() => {
                      player.setRate(rate);
                      closeSpeed(true);
                    }}
                  >
                    {rate}×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {player.failed && (
        <p className={styles.notice} role="alert">
          Không tải được audio của nhóm câu này.
        </p>
      )}
      {player.blocked && !player.playing && (
        <p className={styles.notice} role="status">
          Trình duyệt chặn tự phát — bấm ▶ để nghe.
        </p>
      )}
      {showShortcuts && (
        <p className={styles.shortcuts}>
          <span>
            <Kbd>Space</Kbd> Phát/Dừng
          </span>
          <span>
            <Kbd>Shift</Kbd>+<Kbd>←</Kbd> Tua 3s
          </span>
          <span>
            <Kbd>1-4</Kbd> Chọn đáp án
          </span>
          <span>
            <Kbd>←</Kbd>/<Kbd>→</Kbd> Chuyển câu
          </span>
        </p>
      )}
    </div>
  );
}
