import { memo, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Play } from "lucide-react";

import { cx } from "@/shared/components/ui";

import type {
  PathVideoItem,
  VideoPathData,
  VideoTrack,
  WatchProgressEntry,
  WatchProgressMap,
} from "../../types/video-catalog.types";
import { PATH_GROUPS, PATH_GROUP_KEYS, formatDuration, youtubeThumb } from "./catalog-format";
import styles from "./VideoPathPanel.module.css";

/** Steps shown at first: one before the next video, the next one, and the ones after it. */
const WINDOW_SIZE = 5;
/** "Xem thêm bước" adds this many steps. */
const LOAD_MORE_STEP = 12;

const CEFR_CLASS: Record<string, string | undefined> = {
  a1: styles.cefrA,
  a2: styles.cefrA,
  b1: styles.cefrB1,
  b2: styles.cefrB2,
  c1: styles.cefrC,
  c2: styles.cefrC,
};

interface PathStepProps {
  video: PathVideoItem;
  stepNumber: number;
  progress?: WatchProgressEntry;
  isOpening: boolean;
  isNext: boolean;
  onOpen: (video: PathVideoItem) => void;
}

const PathStep = memo(function PathStep({
  video,
  stepNumber,
  progress,
  isOpening,
  isNext,
  onOpen,
}: PathStepProps) {
  const isDone = !!progress?.completed;
  const percent = progress && !isDone ? progress.percent || 0 : 0;
  const cefr = (video.cefr || "").toLowerCase();
  return (
    <li className={cx(styles.step, isDone && styles.isDone, isNext && styles.isNext)}>
      <button
        type="button"
        className={styles.stepButton}
        onClick={() => onOpen(video)}
        disabled={isOpening}
        title={video.title}
      >
        <span className={styles.number} aria-hidden="true">
          {isDone ? <CheckCircle2 size={16} /> : stepNumber}
        </span>
        <span className={styles.thumb}>
          <img src={youtubeThumb(video.videoId)} alt="" loading="lazy" decoding="async" />
          {percent > 0 && <span className={styles.bar} style={{ width: `${percent}%` }} />}
          {isOpening && (
            <span className={styles.opening}>
              <Loader2 size={14} className={styles.spin} />
            </span>
          )}
        </span>
        <span className={styles.info}>
          <span className={styles.title}>{video.title}</span>
          <span className={styles.meta}>
            <span>{formatDuration(video.duration)}</span>
            {video.cefr && <span className={cx(styles.cefr, CEFR_CLASS[cefr])}>{video.cefr}</span>}
            {video.levelSource !== "subtitles" && (
              <span
                className={styles.estimated}
                title="Cấp độ ước lượng theo kênh — sẽ chấm lại từ phụ đề"
              >
                ước lượng
              </span>
            )}
            <span className={styles.topic}>{video.topicTitle}</span>
            {isDone && <span className={styles.seen}>Đã xem</span>}
          </span>
        </span>
      </button>
    </li>
  );
});

export interface VideoPathPanelProps {
  progress: WatchProgressMap;
  onOpen: (video: PathVideoItem) => void;
  /** videoId being resolved; disables "Học tiếp" and shows the spinner on that step. */
  openingId?: string;
  /** Selected tab (Dễ / Vừa / Khó). */
  group: VideoTrack;
  /** The page persists the choice (localStorage / server) and loads that group's path. */
  onChangeGroup: (group: VideoTrack) => void;
  /** Path of the selected group; undefined/null while it loads. */
  data?: VideoPathData | null;
  /** Message when the group failed to load (shown instead of the list). */
  error?: string;
  /** Per-track counts from any group already loaded, so the tabs keep their numbers while loading. */
  totals?: Partial<Record<VideoTrack, number>>;
}

/** "Lộ trình nghe": tabs with counts, "Học tiếp", progress, 5-step window, "Xem thêm bước". */
export function VideoPathPanel({
  progress,
  onOpen,
  openingId = "",
  group,
  onChangeGroup,
  data,
  error,
  totals,
}: VideoPathPanelProps) {
  const [visibleCount, setVisibleCount] = useState(WINDOW_SIZE);

  const videos = useMemo(() => (data && data.videos) || [], [data]);
  const watchedCount = useMemo(
    () => videos.reduce((n, video) => n + (progress[video.videoId]?.completed ? 1 : 0), 0),
    [videos, progress],
  );
  const nextIndex = useMemo(
    () => videos.findIndex((video) => !progress[video.videoId]?.completed),
    [videos, progress],
  );
  const nextVideo = nextIndex >= 0 ? videos[nextIndex] : null;
  // The window starts right before the next step: learners far along never scroll past a hundred done steps.
  const startIndex = Math.max(
    0,
    Math.min(nextIndex < 0 ? 0 : nextIndex - 1, Math.max(0, videos.length - visibleCount)),
  );
  const visibleVideos = videos.slice(startIndex, startIndex + visibleCount);
  const groupTotals: Partial<Record<VideoTrack, number>> = (data && data.tracks) || totals || {};
  const groupTotal = groupTotals[group] || videos.length;

  const selectGroup = (key: VideoTrack) => {
    setVisibleCount(WINDOW_SIZE);
    onChangeGroup(key);
  };

  return (
    <section className={styles.panel} aria-label="Lộ trình nghe">
      <div className={styles.head}>
        <div>
          <h2 className={styles.heading}>Lộ trình nghe</h2>
          <p className={styles.sub}>Từ dễ đến khó — mỗi video một bước, xem xong là tick.</p>
        </div>
        {nextVideo && (
          <button
            type="button"
            className={styles.next}
            onClick={() => onOpen(nextVideo)}
            disabled={!!openingId}
          >
            <Play size={15} aria-hidden="true" /> Học tiếp
          </button>
        )}
      </div>

      <div className={styles.groups} role="tablist" aria-label="Nhóm lộ trình">
        {PATH_GROUP_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={group === key}
            className={cx(styles.group, group === key && styles.on)}
            onClick={() => selectGroup(key)}
          >
            <span className={styles.groupLabel}>{PATH_GROUPS[key].label}</span>
            <span className={styles.groupHint}>
              {PATH_GROUPS[key].hint}
              {groupTotals[key] ? ` · ${groupTotals[key]}` : ""}
            </span>
          </button>
        ))}
      </div>

      {data && (
        <div className={styles.progress}>
          <span className={styles.progressText}>
            Đã xem <b>{watchedCount}</b>/{groupTotal}
            {nextVideo && (
              <>
                {" "}
                · tiếp theo: <span className={styles.progressNext}>{nextVideo.title}</span>
              </>
            )}
          </span>
          <span className={styles.progressBar} aria-hidden="true">
            <span style={{ width: `${(watchedCount * 100) / Math.max(1, groupTotal)}%` }} />
          </span>
        </div>
      )}

      {!data && !error && (
        <ul className={styles.list} aria-busy="true">
          {[0, 1, 2].map((index) => (
            <li key={index} className={styles.skeleton} />
          ))}
        </ul>
      )}
      {error && !data && <p className={styles.empty}>{error}</p>}
      {data && !videos.length && <p className={styles.empty}>Nhóm này chưa có video.</p>}

      {visibleVideos.length > 0 && (
        <ol className={styles.list}>
          {visibleVideos.map((video, index) => (
            <PathStep
              key={video.videoId}
              video={video}
              stepNumber={startIndex + index + 1}
              progress={progress[video.videoId]}
              isOpening={openingId === video.videoId}
              isNext={!!nextVideo && nextVideo.videoId === video.videoId}
              onOpen={onOpen}
            />
          ))}
        </ol>
      )}
      {startIndex + visibleCount < videos.length && (
        <button
          type="button"
          className={styles.more}
          onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
        >
          Xem thêm bước <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
