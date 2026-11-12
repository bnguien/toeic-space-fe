import type { ReactNode } from "react";

import styles from "./ReaderPlayerFrame.module.css";

interface ReaderPlayerFrameProps {
  iframeId: string;
  videoId: string;
  /** Scale the picture up (hides burned-in subtitles near the edges). */
  zoom: boolean;
  /** YouTube error 101/150: the owner disabled embedding. */
  embedBlocked: boolean;
  onChooseAnother: () => void;
  /** Optional subtitle overlay drawn over the video. */
  children?: ReactNode;
}

export function ReaderPlayerFrame({
  iframeId,
  videoId,
  zoom,
  embedBlocked,
  onChooseAnother,
  children,
}: ReaderPlayerFrameProps) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <div className={styles.frame}>
      <iframe
        id={iframeId}
        title="Video song ngữ"
        className={`${styles.iframe} ${zoom ? styles.zoom : ""}`}
        // enablejsapi=1 + origin: REQUIRED to read getCurrentTime(). cc_load_policy=0 keeps the original captions
        // off. playsinline=1 is REQUIRED on iOS, otherwise Safari opens its full-screen player over the transcript.
        src={
          `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` +
          "?enablejsapi=1&playsinline=1&cc_load_policy=0&rel=0&modestbranding=1" +
          `&origin=${encodeURIComponent(origin)}`
        }
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {embedBlocked && (
        <div className={styles.blocked} role="alert">
          <b>Video này chỉ xem được trên YouTube</b>
          <span>
            Chủ kênh không cho phát nhúng. Video đã được ẩn khỏi danh mục để bạn sau không gặp lại.
          </span>
          <span className={styles.blockedActions}>
            <a
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
              target="_blank"
              rel="noreferrer"
            >
              Mở trên YouTube
            </a>
            <button type="button" onClick={onChooseAnother}>
              Chọn video khác
            </button>
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
