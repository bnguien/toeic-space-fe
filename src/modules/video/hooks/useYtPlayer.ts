// Attaches to an existing YouTube <iframe> and exposes the playback time.
// Only ONE place may create a YT.Player for an iframe: the reader view owns this hook and passes `time` down.
import { useEffect, useRef, useState } from "react";

/** The subset of the YouTube IFrame Player API the reader uses. */
export interface YtPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YtEvent {
  data: number;
}

interface YtNamespace {
  Player: new (
    elementId: string,
    options: {
      events: {
        onReady?: () => void;
        onStateChange?: (event: YtEvent) => void;
        onError?: (event: YtEvent) => void;
      };
    },
  ) => YtPlayer;
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// The IFrame API is loaded once for the whole app: YouTube calls onYouTubeIframeAPIReady exactly once, so two
// loaders overwriting it would leave one waiting forever.
let apiPromise: Promise<YtNamespace | undefined> | null = null;

export function loadYtApi(): Promise<YtNamespace | undefined> {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") prevReady();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

export interface YtPlayerState {
  player: YtPlayer | null;
  time: number;
  /** onReady never fired (sandbox, blocked network) or the player reported an error. */
  syncUnavailable: boolean;
  isPlaying: boolean;
  /** Error code sent by YouTube (2, 5, 100, 101, 150 …), 0 when none. */
  errorCode: number;
  ended: boolean;
}

/**
 * @param iframeId id of the iframe (its src must contain enablejsapi=1)
 * @param videoId  changing it re-attaches the player to the new video
 * @param interval time polling period while playing, ms
 */
export function useYtPlayer(iframeId: string, videoId: string, interval = 120): YtPlayerState {
  const [player, setPlayer] = useState<YtPlayer | null>(null);
  const [time, setTime] = useState(0);
  const [syncUnavailable, setSyncUnavailable] = useState(false);
  const [errorCode, setErrorCode] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );
  const ref = useRef<YtPlayer | null>(null);

  // Hidden tab: stop polling entirely (a 10 Hz loop in the background drains phone batteries).
  useEffect(() => {
    const onVisibilityChange = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!iframeId || !videoId) return undefined;
    let cancelled = false;
    let connectTimeout: ReturnType<typeof setTimeout> | null = null;
    // Keep the player as soon as it is built, without waiting for onReady (see cleanup).
    let justCreated: YtPlayer | null = null;

    void loadYtApi().then((YT) => {
      if (cancelled || !YT) return;
      try {
        const p = new YT.Player(iframeId, {
          events: {
            onReady: () => {
              if (cancelled) return;
              ref.current = p;
              setPlayer(p);
              // Connected: clear the warning and its timer (a player slower than the threshold would otherwise
              // keep the "cannot connect" warning forever while everything works).
              if (connectTimeout) {
                clearTimeout(connectTimeout);
                connectTimeout = null;
              }
              setSyncUnavailable(false);
              setErrorCode(0);
            },
            onStateChange: (e) => {
              if (cancelled) return;
              setIsPlaying(!!e && e.data === 1); // 1 = PLAYING
              setEnded(!!e && e.data === 0); // 0 = ENDED
            },
            // YouTube reports the reason (removed, embedding disabled, restricted account…).
            onError: (e) => {
              if (cancelled) return;
              setErrorCode((e && e.data) || 5);
              setSyncUnavailable(true);
              if (connectTimeout) {
                clearTimeout(connectTimeout);
                connectTimeout = null;
              }
            },
          },
        });
        justCreated = p;
        // If the iframe sandbox blocks postMessage or the network blocks youtube.com, onReady never fires.
        // 20 s, not 8: a signed-in Google user loads extra personalisation and 8 s raised false alarms.
        connectTimeout = setTimeout(() => {
          if (!cancelled && !ref.current) setSyncUnavailable(true);
        }, 20000);
      } catch {
        setSyncUnavailable(true);
      }
    });

    return () => {
      cancelled = true;
      if (connectTimeout) clearTimeout(connectTimeout);
      // Destroy a player that never reached onReady too: otherwise it keeps posting messages to a detached
      // iframe (about:blank inherits the page origin) and logs postMessage origin errors forever.
      const p = ref.current || justCreated;
      ref.current = null;
      justCreated = null;
      if (p && typeof p.destroy === "function") {
        try {
          p.destroy();
        } catch {
          /* iframe may already be detached */
        }
      }
    };
  }, [iframeId, videoId]);

  // Polling adapts: hidden tab → nothing; playing → dense; paused → 500 ms (catches seeks without burning CPU).
  useEffect(() => {
    if (!player || !tabVisible) return undefined;
    const id = setInterval(
      () => {
        try {
          const t = player.getCurrentTime();
          if (typeof t === "number" && !Number.isNaN(t)) setTime(t);
        } catch {
          /* player just detached */
        }
      },
      isPlaying ? interval : 500,
    );
    return () => clearInterval(id);
  }, [player, interval, isPlaying, tabVisible]);

  return { player, time, syncUnavailable, isPlaying, errorCode, ended };
}
