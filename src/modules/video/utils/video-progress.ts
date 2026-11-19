// Watch progress of bilingual videos: the local copy (localStorage, guests too) merged with the server copy
// (signed in). Server: PUT me/progress/{id} — the watched % only grows, ≥ 90 % means completed.
import type { CatalogVideoDto, VideoTrack, WatchProgressDto } from "../types/video.types";

const LS = "ts_video_progress_v1";
const MAX_ENTRIES = 400;
export const DONE_PERCENT = 90;

export interface ProgressEntry {
  position: number;
  duration: number;
  percent: number;
  completed: boolean;
  title: string;
  updatedAt: string;
}

export type ProgressMap = Record<string, ProgressEntry>;

export interface InProgressItem extends ProgressEntry {
  videoId: string;
}

export const GROUPS: Record<VideoTrack, { label: string; description: string }> = {
  easy: { label: "Dễ", description: "A1–A2" },
  medium: { label: "Vừa", description: "B1–B2" },
  hard: { label: "Khó", description: "C1+" },
};

const LS_GROUP = "ts_video_path_track";

const isTrack = (value: unknown): value is VideoTrack =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(GROUPS, value);

/** Track the learner picked last time (default Dễ). */
export function readSelectedGroup(): VideoTrack {
  try {
    const value = localStorage.getItem(LS_GROUP);
    return isTrack(value) ? value : "easy";
  } catch {
    return "easy";
  }
}

export function saveSelectedGroup(track: VideoTrack): void {
  try {
    localStorage.setItem(LS_GROUP, track);
  } catch {
    /* private mode */
  }
}

export interface LevelBadge {
  group: string;
  cefr: string;
  /** Level estimated from the channel (not scored from subtitles yet). */
  estimated: boolean;
}

/** Level label of a catalog video, or null when it has no track yet. */
export function levelBadge(
  video: Pick<CatalogVideoDto, "track" | "cefr" | "levelSource"> | null | undefined,
): LevelBadge | null {
  if (!video || !isTrack(video.track)) return null;
  return {
    group: GROUPS[video.track].label,
    cefr: video.cefr || "",
    estimated: video.levelSource !== "subtitles",
  };
}

export function readLocalProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(LS);
    const data: unknown = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? (data as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ProgressMap): void {
  try {
    const entries = Object.entries(map).sort((a, b) =>
      String(b[1].updatedAt).localeCompare(String(a[1].updatedAt)),
    );
    localStorage.setItem(LS, JSON.stringify(Object.fromEntries(entries.slice(0, MAX_ENTRIES))));
  } catch {
    /* private mode / storage full */
  }
}

export interface ProgressUpdate {
  position: number;
  duration?: number;
  title?: string;
}

/** New entry from the previous one + the position just watched. Pure (testable). */
export function updateEntry(
  prev: ProgressEntry | undefined,
  { position, duration, title }: ProgressUpdate,
  now: string = new Date().toISOString(),
): ProgressEntry {
  const safeDuration = Math.max(0, Math.round(duration || prev?.duration || 0));
  const pos = Math.max(
    0,
    Math.round(safeDuration ? Math.min(position || 0, safeDuration) : position || 0),
  );
  const pt = safeDuration ? Math.min(100, Math.round((pos * 100) / safeDuration)) : 0;
  const percent = Math.max(prev?.percent || 0, pt);
  return {
    position: pos,
    duration: safeDuration,
    percent,
    completed: !!prev?.completed || percent >= DONE_PERCENT,
    title: title || prev?.title || "",
    updatedAt: now,
  };
}

export function writeLocalProgress(videoId: string, data: ProgressUpdate): ProgressEntry {
  const map = readLocalProgress();
  map[videoId] = updateEntry(map[videoId], data);
  writeAll(map);
  return map[videoId];
}

/** Server copy into the local one: the newer entry gives the position, % and "completed" take the maximum. */
export function mergeWatchProgress(
  serverItems: readonly WatchProgressDto[] | null | undefined,
  local: ProgressMap | null | undefined,
): ProgressMap {
  const merged: ProgressMap = { ...(local || {}) };
  (serverItems || []).forEach((s) => {
    const l = merged[s.videoId];
    const isNewer = !l || String(s.updatedAt) >= String(l.updatedAt);
    const source = isNewer ? s : l;
    merged[s.videoId] = {
      position: source.position || 0,
      duration: s.duration || l?.duration || 0,
      percent: Math.max(s.percent || 0, l?.percent || 0),
      completed: !!s.completed || !!l?.completed,
      title: s.title || l?.title || "",
      updatedAt: source.updatedAt,
    };
  });
  return merged;
}

/** Position worth offering "Xem tiếp" (seconds), 0 when not worth asking. */
export function resumePosition(entry: ProgressEntry | null | undefined): number {
  if (!entry || entry.completed) return 0;
  const pos = entry.position || 0;
  if (pos < 15) return 0;
  if (entry.duration && pos > entry.duration - 15) return 0;
  return pos;
}

/** "Đang xem dở" row: not completed, watched past 15 s; newest first. */
export function inProgressList(map: ProgressMap | null | undefined, limit = 12): InProgressItem[] {
  return Object.entries(map || {})
    .filter(([, entry]) => resumePosition(entry) > 0)
    .sort((a, b) => String(b[1].updatedAt).localeCompare(String(a[1].updatedAt)))
    .slice(0, limit)
    .map(([videoId, entry]) => ({ videoId, ...entry }));
}
