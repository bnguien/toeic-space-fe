// Smooth clock for YouTube karaoke.
//
// player.getCurrentTime() of the IFrame API changes only ~4 times per second and arrives a few dozen ms late, so
// reading it directly makes the spoken word jump in steps and sometimes go backwards. Here every new value from
// YouTube anchors the clock; in between it runs on performance.now() × playback rate. Small drift is blended
// in (never backwards), large drift (seek) is followed at once.
import { useMemo } from "react";

import type { YtPlayer } from "./useYtPlayer";

const SNAP_THRESHOLD = 0.35; // s — more drift than this is a seek / cue change: follow immediately
const BLEND_FACTOR = 0.5; // each new YouTube value pulls the clock half way to it
const MAX_FREE_RUN = 0.6; // no new value for too long (slow network, buffering): wait, do not run too far

export interface SmoothClock {
  /** Current playback time (s), smoothed. Cheap; call as often as needed. */
  now(): number;
}

/** Pure clock (testable): `player` = YT.Player, `nowMs` returns milliseconds (performance.now). */
export function createClock(
  player: YtPlayer | null,
  nowMs: () => number = () => performance.now(),
): SmoothClock {
  const st = { raw: -1, t: 0, at: 0, rate: 1, shown: 0, playing: false };
  return {
    now() {
      if (!player) return st.shown;
      const ms = nowMs();
      let raw: number;
      let isPlaying = false;
      try {
        raw = player.getCurrentTime();
        isPlaying = player.getPlayerState() === 1;
      } catch {
        return st.shown;
      }
      if (typeof raw !== "number" || Number.isNaN(raw)) return st.shown;
      // Paused → playing: re-anchor here, otherwise the paused time would count as running.
      if (isPlaying && !st.playing && st.raw >= 0) {
        st.t = raw;
        st.at = ms;
      }
      st.playing = isPlaying;
      const advance = (d: number) => (isPlaying ? Math.min(MAX_FREE_RUN, d / 1000) * st.rate : 0);
      if (raw !== st.raw) {
        const predicted = st.t + advance(ms - st.at);
        const drift = raw - predicted;
        const shouldSnap = st.raw < 0 || Math.abs(drift) > SNAP_THRESHOLD;
        st.t = shouldSnap ? raw : predicted + drift * BLEND_FACTOR;
        st.raw = raw;
        st.at = ms;
        try {
          st.rate = player.getPlaybackRate() || 1;
        } catch {
          st.rate = 1;
        }
        if (shouldSnap) st.shown = st.t;
      }
      let t = st.t + advance(ms - st.at);
      // Never go back on small noise; a real backward seek was handled above (shown = new value).
      if (t < st.shown && st.shown - t < SNAP_THRESHOLD) t = st.shown;
      st.shown = t;
      return t;
    },
  };
}

export function useSmoothClock(player: YtPlayer | null): SmoothClock {
  return useMemo(() => createClock(player), [player]);
}
