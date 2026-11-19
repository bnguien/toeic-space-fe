import { Flag, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

import styles from "./ReaderTransport.module.css";

interface ReaderTransportProps {
  isPlaying: boolean;
  playerReady: boolean;
  /** Index of the sentence playing (-1 = none yet). */
  activeIndex: number;
  sentenceCount: number;
  hasActiveCue: boolean;
  loadingSubs: boolean;
  preparingSubs: boolean;
  onPrev: () => void;
  onReplay: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onEnd: () => void;
}

export function ReaderTransport({
  isPlaying,
  playerReady,
  activeIndex,
  sentenceCount,
  hasActiveCue,
  loadingSubs,
  preparingSubs,
  onPrev,
  onReplay,
  onTogglePlay,
  onNext,
  onEnd,
}: ReaderTransportProps) {
  return (
    <div className={styles.transport} role="toolbar" aria-label="Điều khiển phát">
      <button
        type="button"
        className={styles.button}
        onClick={onPrev}
        disabled={activeIndex <= 0}
        aria-label="Câu trước"
        title="Câu trước (←)"
      >
        <SkipBack size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={onReplay}
        disabled={!hasActiveCue}
        aria-label="Nghe lại câu này"
        title="Nghe lại câu này (R)"
      >
        <RotateCcw size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.play}`}
        onClick={onTogglePlay}
        disabled={!playerReady}
        aria-label={isPlaying ? "Tạm dừng" : "Phát"}
        title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
      >
        {isPlaying ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={onNext}
        disabled={!sentenceCount || activeIndex + 1 >= sentenceCount}
        aria-label="Câu tiếp"
        title="Câu tiếp (→)"
      >
        <SkipForward size={18} aria-hidden="true" />
      </button>
      <span className={styles.spacer} />
      <span className={styles.count}>
        {sentenceCount ? (
          <>
            <b>{activeIndex >= 0 ? activeIndex + 1 : 0}</b>
            {` / ${sentenceCount} câu`}
          </>
        ) : loadingSubs ? (
          preparingSubs ? (
            "Đang chuẩn bị phụ đề…"
          ) : (
            "đang tải phụ đề…"
          )
        ) : (
          "chưa có phụ đề"
        )}
      </span>
      <button
        type="button"
        className={styles.end}
        onClick={onEnd}
        disabled={!sentenceCount}
        aria-label="Kết thúc buổi học"
        title="Kết thúc buổi học: xem tổng kết và ôn từ"
      >
        <Flag size={16} aria-hidden="true" />
        <span className={styles.endText}>Kết thúc</span>
      </button>
    </div>
  );
}
