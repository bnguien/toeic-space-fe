/**
 * View models of the video catalog page (`components/catalog`). Field names mirror Studychill's
 * listening API JSON in camelCase; the page maps the Content service DTOs (`video.types.ts`) to
 * these — most DTOs are structurally assignable as they are.
 */

export type VideoTrack = "easy" | "medium" | "hard";

/** `subtitles` = CEFR scored from the subtitles, anything else = estimated from the channel (shown with ≈). */
export type VideoLevelSource = "estimate" | "subtitles";

/** English subtitles: not checked yet / ready to open / none (Studychill ok/none). */
export type VideoSubtitleStatus = "unknown" | "available" | "missing";

/** One card of a catalog row / path step (Studychill `catalog` + `path` items). */
export interface CatalogVideoItem {
  videoId: string;
  title: string;
  duration: number;
  level?: string;
  channelTitle?: string;
  /** Fallback thumbnail when `i.ytimg.com/vi/<id>/mqdefault.jpg` fails. */
  thumbnail?: string;
  subtitleStatus?: VideoSubtitleStatus;
  difficulty?: number;
  cefr?: string;
  track?: VideoTrack | "";
  levelSource?: VideoLevelSource;
  /** Replaces the channel line under the title (the "Đang xem dở" row: "Xem tiếp từ m:ss"). */
  note?: string;
}

/** A path step: a catalog video plus the topic it belongs to. */
export interface PathVideoItem extends CatalogVideoItem {
  topic?: string;
  topicTitle?: string;
}

/** One page of a topic row (`GET catalog/{slug}?offset&limit`). */
export interface CatalogTopicPage {
  slug: string;
  title: string;
  videos: CatalogVideoItem[];
  hasMore: boolean;
  nextOffset: number;
}

/** A topic of the catalog home with its first page and per-track counts. */
export interface CatalogTopic extends CatalogTopicPage {
  tracks?: Partial<Record<VideoTrack, number>>;
}

/** Loads the next page of a topic row (the row pages itself through an IntersectionObserver). */
export type LoadTopicPage = (
  slug: string,
  offset: number,
  limit: number,
) => Promise<CatalogTopicPage>;

/** "Lộ trình nghe" of one track, ordered easy → hard by the server. */
export interface VideoPathData {
  track: VideoTrack;
  tracks: Partial<Record<VideoTrack, number>>;
  videos: PathVideoItem[];
}

/** Watch progress of one video (merged local + server copy). */
export interface WatchProgressEntry {
  position: number;
  duration: number;
  percent: number;
  completed: boolean;
  title?: string;
  updatedAt?: string;
}

/** videoId → progress. */
export type WatchProgressMap = Record<string, WatchProgressEntry>;

/** "Đang xem dở" item: unfinished, watched past 15 s, newest first. */
export interface InProgressItem extends WatchProgressEntry {
  videoId: string;
}

/** A video of "Video của tôi" / "Video tham khảo" (Studychill `my-videos` items). */
export interface WatchedVideoItem {
  /** Record id (delete / public toggle); falls back to `videoId` as the React key. */
  id: string;
  videoId: string;
  title: string;
  duration: number;
  isPublic: boolean;
  openCount?: number;
  /** Thumbnail override; defaults to the YouTube `mqdefault` image. */
  thumbnail?: string;
  lastOpenedAt?: string;
  /** Channel title, shown as the sharer when `userName` is empty. */
  channel?: string;
  userName?: string;
  userAvatar?: string;
  /** How many learners share this video publicly (the card shows "+N-1"). */
  shareCount?: number;
}

export type MyVideoItem = WatchedVideoItem;
export type SharedVideoItem = WatchedVideoItem;

/** Shown after making a video public that someone already shared. */
export interface DuplicateShareNote {
  /** First sharer's display name. */
  name: string;
  /** How many learners share the same video (including this one). */
  count: number;
}
