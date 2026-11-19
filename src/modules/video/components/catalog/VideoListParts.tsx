import type { KeyboardEvent, MouseEvent } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Globe, Lock, Play, Trash2 } from "lucide-react";

import { cx } from "@/shared/components/ui";

import type { WatchedVideoItem } from "../../types/video-catalog.types";
import { DEFAULT_AVATAR, THUMB_FALLBACK, formatDuration, youtubeThumb } from "./catalog-format";
import styles from "./VideoListParts.module.css";

/* Building blocks shared by "Video của tôi" and "Video tham khảo" (grid cards and mobile rows). */

export interface VideoThumbBoxProps {
  /** `grid` = flush 16:9 top of a desktop card; `row` = fixed-width left thumb of a mobile row. */
  variant: "grid" | "row";
  video: WatchedVideoItem;
  onOpen: () => void;
}

export function VideoThumbBox({ variant, video, onOpen }: VideoThumbBoxProps) {
  const isRow = variant === "row";
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      className={isRow ? styles.rowThumbBox : styles.thumbBox}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
    >
      <img
        src={video.thumbnail || youtubeThumb(video.videoId)}
        alt={video.title}
        className={isRow ? styles.rowThumbImg : styles.thumbImg}
        loading="lazy"
        onError={(event) => {
          if (event.currentTarget.src !== THUMB_FALLBACK) event.currentTarget.src = THUMB_FALLBACK;
        }}
      />
      {video.duration > 0 && (
        <span className={styles.timeBadge}>{formatDuration(video.duration)}</span>
      )}
      <div className={isRow ? styles.rowThumbOverlay : styles.thumbOverlay}>
        <div className={styles.playCircle}>
          <Play size={isRow ? 18 : 16} fill="#fff" />
        </div>
      </div>
    </div>
  );
}

export interface PublicToggleProps {
  isPublic: boolean;
  onToggle: () => void;
}

/** "Công khai" / "Riêng tư" pill; click does not bubble to the card. */
export function PublicToggle({ isPublic, onToggle }: PublicToggleProps) {
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };
  return (
    <button
      type="button"
      className={cx(styles.pill, isPublic ? styles.isPublic : styles.isPrivate)}
      onClick={onClick}
      title={
        isPublic
          ? "Đang công khai. Nhấn để chuyển về riêng tư"
          : "Đang riêng tư. Nhấn để chia sẻ công khai"
      }
    >
      {isPublic ? (
        <>
          <Globe size={12} className={styles.pillIcon} />
          <span>Công khai</span>
        </>
      ) : (
        <>
          <Lock size={12} className={styles.pillIcon} />
          <span>Riêng tư</span>
        </>
      )}
    </button>
  );
}

export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      className={styles.deleteButton}
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      title="Xóa video khỏi danh sách"
    >
      <Trash2 size={13} />
    </button>
  );
}

/** Sharer avatar + name + verified tick + "+N" when several learners share the same video. */
export function AuthorRow({ video }: { video: WatchedVideoItem }) {
  const name = video.userName || video.channel || "Thành viên TOEIC Space";
  const shareCount = video.shareCount || 0;
  return (
    <div className={styles.authorRow} title={`Người chia sẻ: ${name}`}>
      <img
        src={video.userAvatar || DEFAULT_AVATAR}
        alt=""
        className={styles.authorAvatar}
        referrerPolicy="no-referrer"
        onError={(event) => {
          if (event.currentTarget.src !== DEFAULT_AVATAR) event.currentTarget.src = DEFAULT_AVATAR;
        }}
      />
      <span className={styles.authorName}>{name}</span>
      <CheckCircle2 size={12} className={styles.checkBadge} />
      {shareCount > 1 && (
        <span className={styles.shareCount} title={`${shareCount} người cùng chia sẻ video này`}>
          +{shareCount - 1}
        </span>
      )}
    </div>
  );
}

export function ViewAllButton({ showAll, onToggle }: { showAll: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={styles.viewAll} onClick={onToggle}>
      {showAll ? (
        <>
          Thu gọn <ChevronUp size={14} />
        </>
      ) : (
        <>
          Xem tất cả <ChevronDown size={14} />
        </>
      )}
    </button>
  );
}

/** "Học ngay" button of a mobile row. */
export function RowPlayButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className={styles.rowPlay} onClick={onOpen} title="Học ngay video này">
      <Play size={13} fill="currentColor" />
      <span>Học ngay</span>
    </button>
  );
}

export function EmptyBox({ children }: { children: string }) {
  return (
    <div className={styles.emptyBox}>
      <p>{children}</p>
    </div>
  );
}
