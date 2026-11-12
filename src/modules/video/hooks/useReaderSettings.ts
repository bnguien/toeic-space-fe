import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_SETTINGS,
  LISTEN_MODES,
  type ListenMode,
  type ReaderSettingKey,
  type ReaderSettings,
} from "../utils/subtitle-reading";
import { videoApi } from "../api/video.api";
import type { VideoLearnerStateDto } from "../types/video.types";
import {
  localStateChangedAt,
  markLocalStateChanged,
  serverStateChangedAt,
  useVideoLearnerState,
} from "./useVideoLearnerState";

const LS_SETTINGS = "ts_video_reading_settings";
const LS_MODE = "ts_video_listen_mode";
const SERVER_SAVE_DELAY = 800;

/** Known keys only, so a stale or foreign object never adds junk settings. */
function mergeSettings(value: unknown): ReaderSettings {
  const next = { ...DEFAULT_SETTINGS };
  if (value && typeof value === "object") {
    for (const key of Object.keys(DEFAULT_SETTINGS) as ReaderSettingKey[]) {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate === typeof DEFAULT_SETTINGS[key])
        (next as Record<string, unknown>)[key] = candidate;
    }
  }
  return next;
}

function readSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? mergeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const toMode = (value: unknown): ListenMode | null =>
  LISTEN_MODES.find((m) => m.key === value)?.key ?? null;

function readMode(): ListenMode {
  try {
    return toMode(localStorage.getItem(LS_MODE)) ?? "flow";
  } catch {
    return "flow";
  }
}

/**
 * Reading settings and listening mode: localStorage (`ts_video_*`) for everyone, plus the learner's server copy when
 * signed in (`PUT me/state`, debounced). On sign-in the newer copy wins.
 */
export function useReaderSettings(signedIn = false) {
  const [settings, setSettings] = useState<ReaderSettings>(readSettings);
  const [mode, setModeState] = useState<ListenMode>(readMode);
  const timer = useRef<number | undefined>(undefined);
  // Changes caused by mounting or by adopting the server copy are not the learner's: skip them.
  const skipSave = useRef(true);

  // Sign-in merge: the newer copy wins (server adopted, or this device's later change pushed).
  const adopt = useCallback((state: VideoLearnerStateDto) => {
    const serverAt = serverStateChangedAt(state);
    if (state.readerSettings && serverAt >= localStateChangedAt()) {
      skipSave.current = true;
      setSettings(mergeSettings(state.readerSettings));
      const serverMode = toMode(state.listenMode);
      if (serverMode) setModeState(serverMode);
    } else if (localStateChangedAt() > serverAt) {
      void videoApi
        .updateLearnerState({ readerSettings: readSettings(), listenMode: readMode() })
        .catch(() => {});
    }
  }, []);
  const { save } = useVideoLearnerState(signedIn, "reader", adopt);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
    } catch {
      /* private mode */
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_MODE, mode);
    } catch {
      /* private mode */
    }
  }, [mode]);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    markLocalStateChanged();
    if (!signedIn) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => save({ readerSettings: settings, listenMode: mode }),
      SERVER_SAVE_DELAY,
    );
  }, [settings, mode, signedIn, save]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const changeSetting = useCallback(
    <K extends ReaderSettingKey>(key: K, value: ReaderSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return { settings, setSettings, changeSetting, mode, setMode: setModeState };
}
