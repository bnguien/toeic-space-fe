/* Pure helpers of the catalog page (ported from Studychill `videoProgress.js` + the page files). */

import defaultAvatarImage from "@/assets/mascot/oysteic-base.png";
import thumbFallbackImage from "@/assets/mascot/sky-sea-banner.jpg";

import type { CatalogVideoItem, VideoTrack } from "../../types/video-catalog.types";

/** Example link filled into the paste box: a video verified to have many human-made subtitles. */
export const EXAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=R1vskiVDwl4";

/** "Video tham khảo" page size (4 columns × 5 rows). */
export const REF_PAGE_SIZE = 20;

/** "Video của tôi" shows this many cards until "Xem tất cả". */
export const MY_VIDEOS_PREVIEW_COUNT = 4;

/** Sharer avatar when the account has none. */
export const DEFAULT_AVATAR = defaultAvatarImage;

/** Thumbnail shown when the YouTube image fails to load. */
export const THUMB_FALLBACK = thumbFallbackImage;

/** YouTube medium-quality thumbnail (320×180). */
export const youtubeThumb = (videoId: string): string =>
  `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

/** Path groups "Dễ / Vừa / Khó" with their CEFR hint. */
export const PATH_GROUPS: Record<VideoTrack, { label: string; hint: string }> = {
  easy: { label: "Dễ", hint: "A1–A2" },
  medium: { label: "Vừa", hint: "B1–B2" },
  hard: { label: "Khó", hint: "C1+" },
};

export const PATH_GROUP_KEYS: VideoTrack[] = ["easy", "medium", "hard"];

/** `m:ss` from seconds (rounded). */
export function formatDuration(seconds: number | undefined): string {
  const total = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** `h:mm:ss` / `m:ss` from seconds (floored) — the "Xem tiếp từ …" note. */
export function formatTime(seconds: number | undefined): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return hours ? `${hours}:${pad2(minutes)}:${pad2(rest)}` : `${minutes}:${pad2(rest)}`;
}

export interface LevelBadge {
  /** "Dễ" | "Vừa" | "Khó" */
  group: string;
  cefr: string;
  /** Estimated from the channel (shown as ≈) instead of scored from the subtitles. */
  estimated: boolean;
}

/** Level chip of a catalog video, or null when the video has no track yet. */
export function levelBadge(video: CatalogVideoItem | undefined): LevelBadge | null {
  if (!video || !video.track || !PATH_GROUPS[video.track]) return null;
  return {
    group: PATH_GROUPS[video.track].label,
    cefr: video.cefr || "",
    estimated: video.levelSource !== "subtitles",
  };
}

/** Vietnamese thousands grouping for the saved-word counter ("1.248"). */
export const formatCount = (value: number): string => new Intl.NumberFormat("vi-VN").format(value);
