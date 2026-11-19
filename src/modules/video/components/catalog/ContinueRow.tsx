import { useMemo } from "react";

import type {
  CatalogTopic,
  CatalogVideoItem,
  InProgressItem,
  WatchProgressMap,
} from "../../types/video-catalog.types";
import { formatTime } from "./catalog-format";
import { TopicRow } from "./TopicRow";
import styles from "./ContinueRow.module.css";

export const CONTINUE_ROW_SLUG = "__in-progress";

export interface ContinueRowProps {
  /** Unfinished videos watched past 15 s, newest first (empty → nothing rendered). */
  items: InProgressItem[];
  onOpen: (video: CatalogVideoItem) => void;
  openingId?: string;
  hiddenIds?: ReadonlySet<string>;
  progress?: WatchProgressMap;
}

/** "Đang xem dở" row: the learner's unfinished videos with "Xem tiếp từ m:ss" under each title. */
export function ContinueRow({ items, onOpen, openingId, hiddenIds, progress }: ContinueRowProps) {
  const topic = useMemo<CatalogTopic | null>(
    () =>
      items.length
        ? {
            slug: CONTINUE_ROW_SLUG,
            title: "Đang xem dở",
            hasMore: false,
            nextOffset: items.length,
            videos: items.map((item) => ({
              videoId: item.videoId,
              title: item.title || item.videoId,
              duration: item.duration,
              note: `Xem tiếp từ ${formatTime(item.position)}`,
            })),
          }
        : null,
    [items],
  );

  if (!topic) return null;

  return (
    <div className={styles.continueRow}>
      <TopicRow
        key={topic.videos.map((video) => video.videoId).join(",")}
        topic={topic}
        onOpen={onOpen}
        openingId={openingId}
        hiddenIds={hiddenIds}
        progress={progress}
      />
    </div>
  );
}
