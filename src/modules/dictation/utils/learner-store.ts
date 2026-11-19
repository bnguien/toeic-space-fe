/**
 * Per-learner dictation state: stage stars, study seconds per day, play settings (Cơ bản / Pro), the chosen
 * voice and sound-effect preferences.
 *
 * Guests keep everything in localStorage (`ts-dictation-*`). For a signed-in learner the same values are
 * persisted on the server (`GET/PUT /dictation/me/state`): on sign-in the local copy is merged into the
 * server copy the way Studychill's learnerSync did — stars and study seconds take the larger value per key,
 * settings / voice / sound keep the newer write — and every later change is pushed (debounced). A different
 * account signing in on the same browser starts from the server copy only (the previous learner's local
 * data is cleared; theirs is safe on the server).
 */
import { dictationApi } from "../api/dictation.api";
import type {
  DictationLearnerStateDto,
  DictationLearnerStatePatch,
  PlaySettingsBlob,
  SoundPrefs,
} from "../types/dictation.types";

export const STORAGE_KEYS = {
  progress: "ts-dictation-progress",
  sessions: "ts-dictation-sessions",
  dailySeconds: "ts-dictation-daily-seconds",
  settings: "ts-dictation-play-settings",
  voice: "ts-dictation-voice",
  sound: "ts-dictation-sound",
  soundPrefs: "ts-dictation-sound-prefs",
  meta: "ts-dictation-sync-meta",
} as const;

const PUSH_DELAY_MS = 2000;
const DAILY_KEEP = 14;

type Section = "stars" | "dailySeconds" | "settings" | "voice" | "sound";

interface SyncMeta {
  /** Account the local data belongs to; null = guest data not yet adopted. */
  owner: string | null;
  /** Local write time (ms) of the "newer wins" sections. */
  t: { settings?: number; voice?: number; sound?: number };
}

export interface PlaySettingsStore {
  basic?: PlaySettingsBlob;
  pro?: PlaySettingsBlob;
}

export const DEFAULT_SOUND: SoundPrefs = {
  enabled: true,
  volume: 0.8,
  tick: "wood",
  chime: "bell",
};

// ── localStorage helpers ─────────────────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const data = JSON.parse(raw) as unknown;
    return data && typeof data === "object" ? (data as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeRaw(key: string, value: string | null): void {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode or full storage: the in-memory value still works this session */
  }
}

const writeJson = (key: string, value: unknown) => writeRaw(key, JSON.stringify(value));

function readMeta(): SyncMeta {
  const meta = readJson<Partial<SyncMeta>>(STORAGE_KEYS.meta, {});
  return { owner: typeof meta.owner === "string" ? meta.owner : null, t: { ...(meta.t ?? {}) } };
}

const writeMeta = (meta: SyncMeta) => writeJson(STORAGE_KEYS.meta, meta);

function readSound(): SoundPrefs {
  const prefs = readJson<Partial<SoundPrefs>>(STORAGE_KEYS.soundPrefs, {});
  let enabled = true;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEYS.sound) !== "off";
  } catch {
    /* default on */
  }
  return { ...DEFAULT_SOUND, ...prefs, enabled };
}

function writeSound(sound: SoundPrefs): void {
  writeRaw(STORAGE_KEYS.sound, sound.enabled ? "on" : "off");
  writeJson(STORAGE_KEYS.soundPrefs, {
    volume: sound.volume,
    tick: sound.tick,
    chime: sound.chime,
  });
}

function readVoice(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.voice) || "";
  } catch {
    return "";
  }
}

const maxMap = (a: Record<string, number>, b: Record<string, number>) => {
  const out: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b))
    out[key] = Math.max(Number(out[key]) || 0, Number(value) || 0);
  return out;
};

const pruneDays = (daily: Record<string, number>) => {
  const out = { ...daily };
  Object.keys(out)
    .sort()
    .slice(0, -DAILY_KEEP)
    .forEach((key) => {
      delete out[key];
    });
  return out;
};

// ── store ────────────────────────────────────────────────────────────────────

export interface LearnerSnapshot {
  stars: Record<string, number>;
  dailySeconds: Record<string, number>;
  settings: PlaySettingsStore;
  voice: string;
  sound: SoundPrefs;
  /** True once the server copy of a signed-in learner has been merged in. */
  synced: boolean;
}

const listeners = new Set<() => void>();
let snapshot: LearnerSnapshot | null = null;
let owner: string | null = null; // signed-in account being synced, null = guest
let pulling: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const dirty = new Set<Section>();

function load(): LearnerSnapshot {
  return {
    stars: readJson<Record<string, number>>(STORAGE_KEYS.progress, {}),
    dailySeconds: readJson<Record<string, number>>(STORAGE_KEYS.dailySeconds, {}),
    settings: readJson<PlaySettingsStore>(STORAGE_KEYS.settings, {}),
    voice: readVoice(),
    sound: readSound(),
    synced: false,
  };
}

export function getLearnerSnapshot(): LearnerSnapshot {
  if (!snapshot) snapshot = typeof window === "undefined" ? { ...load(), stars: {} } : load();
  return snapshot;
}

export function subscribeLearner(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(next: LearnerSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function persist(next: LearnerSnapshot, sections: Section[]) {
  for (const section of sections) {
    if (section === "stars") writeJson(STORAGE_KEYS.progress, next.stars);
    else if (section === "dailySeconds") writeJson(STORAGE_KEYS.dailySeconds, next.dailySeconds);
    else if (section === "settings") writeJson(STORAGE_KEYS.settings, next.settings);
    else if (section === "voice") writeRaw(STORAGE_KEYS.voice, next.voice || null);
    else writeSound(next.sound);
  }
}

/** Applies a local change: localStorage now, server (signed in) after a short debounce. */
export function updateLearner(
  sections: Section[],
  change: (current: LearnerSnapshot) => LearnerSnapshot,
) {
  const next = change(getLearnerSnapshot());
  persist(next, sections);
  const meta = readMeta();
  const now = Date.now();
  for (const section of sections) {
    if (section === "settings" || section === "voice" || section === "sound") meta.t[section] = now;
  }
  writeMeta(meta);
  emit(next);
  if (!owner) return;
  sections.forEach((section) => dirty.add(section));
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushLearnerState();
  }, PUSH_DELAY_MS);
}

function patchOf(state: LearnerSnapshot, sections: Iterable<Section>): DictationLearnerStatePatch {
  const meta = readMeta();
  const patch: DictationLearnerStatePatch = {};
  for (const section of sections) {
    if (section === "stars") patch.stars = state.stars;
    else if (section === "dailySeconds") patch.dailySeconds = state.dailySeconds;
    else if (section === "settings") {
      patch.settings = { basic: state.settings.basic ?? null, pro: state.settings.pro ?? null };
      patch.settingsUpdatedAt = meta.t.settings ?? Date.now();
    } else if (section === "voice") {
      patch.voice = state.voice;
      patch.voiceUpdatedAt = meta.t.voice ?? Date.now();
    } else {
      patch.sound = state.sound;
      patch.soundUpdatedAt = meta.t.sound ?? Date.now();
    }
  }
  return patch;
}

/** Pushes pending changes of a signed-in learner. Failures keep them pending for the next change. */
export async function flushLearnerState(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!owner || !dirty.size) return;
  const sections = [...dirty];
  dirty.clear();
  try {
    await dictationApi.putLearnerState(patchOf(getLearnerSnapshot(), sections));
  } catch {
    sections.forEach((section) => dirty.add(section));
  }
}

/** Server copy + local copy → merged state, and which sections the server is missing. */
export function mergeLearnerState(
  local: LearnerSnapshot,
  localTimes: SyncMeta["t"],
  server: DictationLearnerStateDto,
): { state: LearnerSnapshot; push: Section[]; times: SyncMeta["t"] } {
  const push: Section[] = [];
  const stars = maxMap(server.stars ?? {}, local.stars);
  const dailySeconds = pruneDays(maxMap(server.dailySeconds ?? {}, local.dailySeconds));
  if (JSON.stringify(stars) !== JSON.stringify(server.stars ?? {})) push.push("stars");
  if (JSON.stringify(dailySeconds) !== JSON.stringify(server.dailySeconds ?? {}))
    push.push("dailySeconds");
  const times = { ...localTimes };

  const localSettingsNewer = (localTimes.settings ?? 0) > (server.settingsUpdatedAt ?? 0);
  const serverSettings: PlaySettingsStore = {
    ...(server.settings?.basic ? { basic: server.settings.basic } : {}),
    ...(server.settings?.pro ? { pro: server.settings.pro } : {}),
  };
  let settings = local.settings;
  if (localSettingsNewer) push.push("settings");
  else if (server.settingsUpdatedAt) {
    settings = serverSettings;
    times.settings = server.settingsUpdatedAt;
  }

  let voice = local.voice;
  if ((localTimes.voice ?? 0) > (server.voiceUpdatedAt ?? 0)) push.push("voice");
  else if (server.voiceUpdatedAt) {
    voice = server.voice ?? "";
    times.voice = server.voiceUpdatedAt;
  }

  let sound = local.sound;
  if ((localTimes.sound ?? 0) > (server.soundUpdatedAt ?? 0)) push.push("sound");
  else if (server.soundUpdatedAt && server.sound) {
    sound = { ...DEFAULT_SOUND, ...server.sound };
    times.sound = server.soundUpdatedAt;
  }

  return { state: { stars, dailySeconds, settings, voice, sound, synced: true }, push, times };
}

/**
 * Starts syncing for the signed-in account (`userId`) or stops it (null). Called by
 * `useDictationLearnerSync` whenever the session changes.
 */
export function setLearnerAccount(userId: string | null): Promise<void> {
  if (userId === owner && (pulling || snapshot?.synced || !userId))
    return pulling ?? Promise.resolve();
  if (!userId) {
    void flushLearnerState();
    owner = null;
    emit({ ...getLearnerSnapshot(), synced: false });
    return Promise.resolve();
  }
  owner = userId;
  const meta = readMeta();
  if (meta.owner && meta.owner !== userId) {
    // Another learner used this browser before: their copy lives on the server, start clean.
    (
      ["progress", "sessions", "dailySeconds", "settings", "voice", "sound", "soundPrefs"] as const
    ).forEach((key) => writeRaw(STORAGE_KEYS[key], null));
    writeMeta({ owner: null, t: {} });
    emit(load());
  }
  const account = userId;
  pulling = dictationApi
    .getLearnerState()
    .then((server) => {
      if (owner !== account) return;
      const current = readMeta();
      const { state, push, times } = mergeLearnerState(getLearnerSnapshot(), current.t, server);
      persist(state, ["stars", "dailySeconds", "settings", "voice", "sound"]);
      writeMeta({ owner: account, t: times });
      emit(state);
      push.forEach((section) => dirty.add(section));
      return flushLearnerState();
    })
    .catch(() => {
      // Offline or server error: keep the local copy, try again on the next session change.
      if (owner === account) owner = null;
    })
    .finally(() => {
      pulling = null;
    });
  return pulling;
}

// ── read helpers used across the module ─────────────────────────────────────

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const localDay = today;

/** Sessions (resume of a static source) stay on this browser only, as in Studychill. */
export function readSessions<T>(): Record<string, T> {
  return readJson<Record<string, T>>(STORAGE_KEYS.sessions, {});
}

export function writeSessions<T>(sessions: Record<string, T>): void {
  writeJson(STORAGE_KEYS.sessions, sessions);
}
