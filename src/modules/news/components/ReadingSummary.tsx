import { BookmarkPlus } from "lucide-react";
import { Link } from "react-router-dom";

import { formatDuration, speedComment } from "../utils/news-reader";
import styles from "./ReadingSummary.module.css";

interface ReadingSummaryProps {
  title: string;
  seconds: number;
  wpm: number;
  lookedUpCount: number;
  knownCount: number;
  vocabularyCount: number;
  done: boolean;
  unsavedWords: string[];
  onSaveAll: () => void;
  onClose: () => void;
}

/** "Hoàn thành bài đọc": time, speed, looked-up and known words, and the words still to save. */
export function ReadingSummary({
  title,
  seconds,
  wpm,
  lookedUpCount,
  knownCount,
  vocabularyCount,
  done,
  unsavedWords,
  onSaveAll,
  onClose,
}: ReadingSummaryProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-summary-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.kicker}>Hoàn thành bài đọc</span>
        <h2 id="reading-summary-title">{title}</h2>
        <dl className={styles.grid}>
          <div>
            <dt>Thời gian</dt>
            <dd>{formatDuration(seconds)}</dd>
          </div>
          <div>
            <dt>Tốc độ</dt>
            <dd>
              {wpm || "—"}
              <small> từ/phút</small>
            </dd>
          </div>
          <div>
            <dt>Đã tra</dt>
            <dd>
              {lookedUpCount}
              <small> từ</small>
            </dd>
          </div>
          <div>
            <dt>Đã biết</dt>
            <dd>
              {knownCount}
              <small>/{vocabularyCount}</small>
            </dd>
          </div>
        </dl>
        <p className={styles.note}>{speedComment(wpm)}</p>
        {done && <p className={styles.done}>Đã hoàn thành</p>}
        {unsavedWords.length > 0 ? (
          <>
            <p className={styles.note}>
              {unsavedWords.length} từ bạn chưa biết / đã tra nhưng chưa lưu:
            </p>
            <p className={styles.words}>{unsavedWords.join(" · ")}</p>
            <button type="button" className={styles.primary} onClick={onSaveAll}>
              <BookmarkPlus size={16} /> Lưu {unsavedWords.length} từ vào sổ tay
            </button>
          </>
        ) : (
          <p className={styles.note}>Tất cả từ mới đã nằm trong sổ tay. Giỏi lắm!</p>
        )}
        <div className={styles.links}>
          <Link to="/vocabulary?view=library">Ôn trong Sổ tay</Link>
          <Link to="/games/news">Đọc bài khác</Link>
        </div>
      </div>
    </div>
  );
}
