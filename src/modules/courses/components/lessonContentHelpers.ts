import type { VideoChapter } from "./LessonVideoPlayer";

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.replace(/[[\]]/g, "").trim().split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/** Extracts video chapters from markdown text if present */
export function extractVideoChapters(markdown: string): VideoChapter[] {
  if (!markdown) return [];
  const chapters: VideoChapter[] = [];
  const regex =
    /(?:^|\n)(?:[-*#>\s]*)(?:\[?(\d{1,2}:[0-5]\d(?::[0-5]\d)?)\]?)\s*(?:[-:–—]?)\s*(.+)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const timeStr = match[1];
    const label = match[2].trim().replace(/\*+/g, "").slice(0, 60);
    const seconds = parseTimestampToSeconds(timeStr);
    if (label && !chapters.some((c) => c.time === seconds)) {
      chapters.push({ time: seconds, label });
    }
  }
  return chapters.sort((a, b) => a.time - b.time);
}
