import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import type {
  CatalogTopic,
  CatalogVideoItem,
  InProgressItem,
  LoadTopicPage,
  VideoPathData,
  VideoTrack,
  WatchProgressMap,
} from "../../types/video-catalog.types";
import { ContinueRow } from "./ContinueRow";
import { TopicRow, TopicRowSkeleton } from "./TopicRow";
import { VideoPathPanel } from "./VideoPathPanel";
import styles from "./VideoCatalogRows.module.css";

/** Topics shown before "Xem thêm chủ đề (N)". */
const COLLAPSED_TOPIC_COUNT = 4;
/** Whether the learner expanded the topic list last time (a per-browser preference). */
const TOPICS_OPEN_KEY = "toeicspace.video.topicsOpen";

const EMPTY_PROGRESS: WatchProgressMap = {};
const EMPTY_IN_PROGRESS: InProgressItem[] = [];

function readTopicsOpen(): boolean {
  try {
    return localStorage.getItem(TOPICS_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTopicsOpen(open: boolean) {
  try {
    localStorage.setItem(TOPICS_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export interface VideoCatalogRowsProps {
  /** Catalog topics with their first page; null while loading, [] when there is none. */
  topics: CatalogTopic[] | null;
  /** Next page of a topic row (called by the rows when scrolled near the end). */
  onLoadMoreTopic?: LoadTopicPage;
  onOpen: (video: CatalogVideoItem) => void;
  /** videoId being resolved right now. */
  openingId?: string;
  /** Videos hidden for this visitor after a `no_english` error. */
  hiddenIds?: ReadonlySet<string>;
  /** Notice shown above the rows (open errors of catalog videos), dismissible. */
  notice?: string;
  onDismissNotice?: () => void;
  progress?: WatchProgressMap;
  /** "Đang xem dở" items. */
  inProgress?: InProgressItem[];
  /** Selected path group (Dễ / Vừa / Khó). */
  group?: VideoTrack;
  onChangeGroup: (group: VideoTrack) => void;
  /** Path of the selected group (undefined/null = loading). */
  pathData?: VideoPathData | null;
  pathError?: string;
  /** Per-track counts from any loaded group, for the tabs while the selected one loads. */
  pathTotals?: Partial<Record<VideoTrack, number>>;
}

/**
 * Curated videos of the catalog page: "Đang xem dở", the listening path, then one scrolling row per
 * topic (sorted by the share of videos in the selected group), 4 shown until "Xem thêm chủ đề".
 */
export function VideoCatalogRows({
  topics,
  onLoadMoreTopic,
  onOpen,
  openingId = "",
  hiddenIds,
  notice = "",
  onDismissNotice,
  progress = EMPTY_PROGRESS,
  inProgress = EMPTY_IN_PROGRESS,
  group = "easy",
  onChangeGroup,
  pathData,
  pathError,
  pathTotals,
}: VideoCatalogRowsProps) {
  const [showAllTopics, setShowAllTopics] = useState(readTopicsOpen);

  // Topics with many videos of the selected group first; equal shares keep the admin order.
  const sortedTopics = useMemo(() => {
    if (!topics) return [];
    const groupShare = (topic: CatalogTopic) => {
      const counts = topic.tracks || {};
      const total = (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
      return total ? (counts[group] || 0) / total : 0;
    };
    return topics
      .map((topic, index) => ({ topic, index, share: groupShare(topic) }))
      .sort((a, b) => b.share - a.share || a.index - b.index)
      .map((entry) => entry.topic);
  }, [topics, group]);
  const visibleTopics = showAllTopics ? sortedTopics : sortedTopics.slice(0, COLLAPSED_TOPIC_COUNT);
  const hiddenTopicCount = sortedTopics.length - visibleTopics.length;

  const toggleShowAll = () => {
    const next = !showAllTopics;
    setShowAllTopics(next);
    writeTopicsOpen(next);
  };

  const hasContinueRow = inProgress.length > 0;
  if (topics && !topics.length && !hasContinueRow) return null;

  return (
    <section className={styles.rows} aria-label="Video chọn sẵn">
      <ContinueRow
        items={inProgress}
        onOpen={onOpen}
        openingId={openingId}
        hiddenIds={hiddenIds}
        progress={progress}
      />
      {topics && topics.length > 0 && (
        <VideoPathPanel
          progress={progress}
          onOpen={onOpen}
          openingId={openingId}
          group={group}
          onChangeGroup={onChangeGroup}
          data={pathData}
          error={pathError}
          totals={pathTotals}
        />
      )}
      <div className={styles.head}>
        <h2 className={styles.heading}>Khám phá theo chủ đề</h2>
        <p className={styles.sub}>Video chọn sẵn cho người học — bấm là xem với phụ đề song ngữ.</p>
      </div>
      {notice && (
        <div className={styles.notice} role="status">
          <span>{notice}</span>
          {onDismissNotice && (
            <button type="button" onClick={onDismissNotice} aria-label="Đóng thông báo">
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {topics === null ? (
        <TopicRowSkeleton />
      ) : (
        visibleTopics.map((topic) => (
          <TopicRow
            key={topic.slug}
            topic={topic}
            onOpen={onOpen}
            openingId={openingId}
            hiddenIds={hiddenIds}
            progress={progress}
            onLoadMore={onLoadMoreTopic}
          />
        ))
      )}
      {(hiddenTopicCount > 0 || (showAllTopics && sortedTopics.length > COLLAPSED_TOPIC_COUNT)) && (
        <button
          type="button"
          className={styles.toggle}
          onClick={toggleShowAll}
          aria-expanded={showAllTopics}
        >
          {showAllTopics ? (
            <>
              Thu gọn chủ đề <ChevronUp size={15} aria-hidden="true" />
            </>
          ) : (
            <>
              {`Xem thêm chủ đề (${hiddenTopicCount})`} <ChevronDown size={15} aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
