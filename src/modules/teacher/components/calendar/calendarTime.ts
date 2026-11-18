import type { SessionView } from "@/modules/admin";

export const ICT_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const HOUR_HEIGHT = 56;
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarTone {
  background: string;
  accent: string;
  text: string;
}

const TONES: CalendarTone[] = [
  { background: "#e5f7f0", accent: "#2f8f6f", text: "#1d6a51" },
  { background: "#e8effc", accent: "#4f6fb8", text: "#334f8f" },
  { background: "#fdeee4", accent: "#c47a45", text: "#94501f" },
  { background: "#fdf6dd", accent: "#b38c2f", text: "#78601a" },
  { background: "#f1eafd", accent: "#7a5bb5", text: "#5a3f93" },
  { background: "#fde9ef", accent: "#bb5578", text: "#963c5c" },
  { background: "#e7f3f8", accent: "#4a87a3", text: "#2f657d" },
];

/** Stable pastel tone per class so every session of a class shares one color. */
export function classTone(classId: string): CalendarTone {
  let hash = 0;
  for (let index = 0; index < classId.length; index += 1) {
    hash = (hash * 31 + classId.charCodeAt(index)) >>> 0;
  }
  return TONES[hash % TONES.length];
}

/** One pastel tone per weekday column, Monday through Sunday. */
export function weekdayTone(dayIndex: number): CalendarTone {
  return TONES[((dayIndex % 7) + 7) % 7];
}

/** Wall-clock date in ICT, stored as a UTC-midnight Date so UTC getters expose ICT values. */
export function ictWallClock(reference: Date = new Date()): Date {
  const shifted = new Date(reference.getTime() + ICT_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted;
}

export function ictTodayKey(reference: Date = new Date()): string {
  return ictWallClock(reference).toISOString().slice(0, 10);
}

export function ictWeekdayIndex(reference: Date = new Date()): number {
  return (new Date(reference.getTime() + ICT_OFFSET_MS).getUTCDay() + 6) % 7;
}

/** Monday of the ICT week containing the reference instant. */
export function startOfIctWeek(reference: Date = new Date()): Date {
  const wall = ictWallClock(reference);
  wall.setUTCDate(wall.getUTCDate() - ictWeekdayIndex(reference));
  return wall;
}

export function addWallDays(wall: Date, days: number): Date {
  const next = new Date(wall);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function wallDateKey(wall: Date): string {
  return wall.toISOString().slice(0, 10);
}

/** Converts an ICT wall-clock Date (UTC-midnight carrier) to the real UTC instant. */
export function wallToIso(wall: Date): string {
  return new Date(wall.getTime() - ICT_OFFSET_MS).toISOString();
}

export function ictDateIndex(iso: string, weekStart: Date): number | null {
  const wall = ictWallClock(new Date(iso));
  const diff = Math.round((wall.getTime() - weekStart.getTime()) / DAY_MS);
  return diff >= 0 && diff < 7 ? diff : null;
}

/** Minutes after ICT midnight for an instant. */
export function ictMinutes(iso: string): number {
  const shifted = new Date(new Date(iso).getTime() + ICT_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ICT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ICT_TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const rangeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ICT_TIME_ZONE,
  day: "numeric",
  month: "long",
});

export function formatIctTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatIctSessionDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}

export function formatIctRange(start: string, end: string): string {
  return `${rangeFormatter.format(new Date(start))} – ${rangeFormatter.format(new Date(end))}`;
}

export function visibleHourRange(sessions: SessionView[]): { startHour: number; endHour: number } {
  let start = 7;
  let end = 21;
  for (const session of sessions) {
    const startMinutes = ictMinutes(session.startAt);
    const endMinutes = Math.max(startMinutes + 15, ictMinutes(session.endAt));
    start = Math.min(start, Math.floor(startMinutes / 60));
    end = Math.max(end, Math.ceil(endMinutes / 60));
  }
  const startHour = Math.max(0, start);
  return { startHour, endHour: Math.min(24, Math.max(end, startHour + 2)) };
}

export interface PositionedSession {
  session: SessionView;
  top: number;
  height: number;
  left: string;
  width: string;
}

interface TimedSession {
  session: SessionView;
  start: number;
  end: number;
}

const byStart = (left: TimedSession, right: TimedSession) =>
  left.start - right.start || left.end - right.end;

/**
 * Places sessions inside one day column. Overlapping sessions are split into equal
 * columns so no card is hidden behind another.
 */
export function layoutDaySessions(
  sessions: SessionView[],
  startHour: number,
  hourHeight = HOUR_HEIGHT,
): PositionedSession[] {
  const dayStart = startHour * 60;
  const timed = sessions
    .map((session) => ({
      session,
      start: Math.max(dayStart, ictMinutes(session.startAt)),
      end: Math.max(dayStart, ictMinutes(session.endAt)),
    }))
    .filter((entry) => entry.end > dayStart)
    .sort(byStart);

  const positioned: PositionedSession[] = [];
  let cluster: TimedSession[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const assignment = cluster.map((entry) => {
      let column = columnEnds.findIndex((end) => end <= entry.start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(entry.end);
      } else {
        columnEnds[column] = entry.end;
      }
      return { entry, column };
    });
    const columns = columnEnds.length;
    for (const { entry, column } of assignment) {
      positioned.push({
        session: entry.session,
        top: ((entry.start - dayStart) / 60) * hourHeight,
        height: Math.max(((Math.min(entry.end, 24 * 60) - entry.start) / 60) * hourHeight - 3, 32),
        left: `${(column / columns) * 100}%`,
        width: `${100 / columns}%`,
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const entry of timed) {
    if (cluster.length && entry.start >= clusterEnd) flush();
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.end);
  }
  flush();
  return positioned;
}
