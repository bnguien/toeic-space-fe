import { memo } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { cx } from "@/shared/components/ui";

import type { CatalogVideoItem, WatchProgressEntry } from "../../types/video-catalog.types";
import { formatDuration, levelBadge, youtubeThumb } from "./catalog-format";
import styles from "./VideoCard.module.css";

export interface VideoCardProps {
  video: CatalogVideoItem;
  /** This card is being resolved ("Đang lấy phụ đề…" overlay, button disabled). */
  isOpening?: boolean;
  onOpen: (video: CatalogVideoItem) => void;
  /** Learner's watch progress of this video ("Đã xem" badge, progress bar). */
  progress?: WatchProgressEntry;
}

const LEVEL_CLASS: Record<string, string | undefined> = {
  a1: styles.levelA,
  a2: styles.levelA,
  b1: styles.levelB1,
  b2: styles.levelB2,
  c1: styles.levelC,
  c2: styles.levelC,
};

/** 216 px card of a topic row: mqdefault thumb, duration, CC, "Đã xem", progress bar, title, level chip, channel. */
export const VideoCard = memo(function VideoCard({
  video,
  isOpening = false,
  onOpen,
  progress,
}: VideoCardProps) {
  const level = levelBadge(video);
  const isDone = !!progress?.completed;
  const percent = progress ? (isDone ? 100 : progress.percent || 0) : 0;
  const levelKey = (level ? level.cefr || "b1" : video.level || "").toLowerCase();

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onOpen(video)}
      disabled={isOpening}
      title={video.title}
    >
      <span className={styles.thumb}>
        <img
          src={youtubeThumb(video.videoId)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(event) => {
            if (video.thumbnail && event.currentTarget.src !== video.thumbnail) {
              event.currentTarget.src = video.thumbnail;
            }
          }}
        />
        {video.duration > 0 && (
          <span className={styles.duration}>{formatDuration(video.duration)}</span>
        )}
        {video.subtitleStatus === "available" && (
          <span className={styles.captions} title="Đã có phụ đề — mở ngay">
            CC
          </span>
        )}
        {isDone && (
          <span className={styles.seen}>
            <CheckCircle2 size={12} aria-hidden="true" /> Đã xem
          </span>
        )}
        {percent > 0 && (
          <span
            className={cx(styles.bar, isDone && styles.barDone)}
            style={{ width: `${percent}%` }}
          />
        )}
        {isOpening && (
          <span className={styles.opening}>
            <Loader2 size={18} className={styles.spin} aria-hidden="true" />
            Đang lấy phụ đề…
          </span>
        )}
      </span>
      <span className={styles.title}>{video.title}</span>
      <span className={styles.meta}>
        {level ? (
          <span
            className={cx(styles.level, LEVEL_CLASS[levelKey], level.estimated && styles.estimated)}
            title={level.estimated ? "Cấp độ ước lượng theo kênh" : "Cấp độ chấm từ phụ đề"}
          >
            {`${level.group} · ${level.estimated ? "≈" : ""}${level.cefr}`}
          </span>
        ) : (
          video.level && (
            <span className={cx(styles.level, LEVEL_CLASS[levelKey])}>{video.level}</span>
          )
        )}
        <span className={styles.channel}>{video.note || video.channelTitle}</span>
      </span>
    </button>
  );
});
