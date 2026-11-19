import { useNavigate } from "react-router-dom";
import { Bookmark } from "lucide-react";

import vocabIllustration from "@/assets/mascot/oy2-reading.png";
import quoteBackground from "@/assets/pastel-landscape.png";

import { formatCount } from "./catalog-format";
import styles from "./VideoSidebar.module.css";

/** PBL-75 notebook ("Của tôi"). */
export const DEFAULT_VOCAB_HREF = "/vocabulary?view=library";

export interface VideoSidebarProps {
  isGuest: boolean;
  /** Saved words; null until known (never a sample number). */
  vocabCount: number | null;
  /** Percent of saved words reviewed at least once; null until known. */
  reviewedPercent: number | null;
  /** Where "Xem sổ từ vựng" goes. */
  vocabHref?: string;
}

/** Right column: "Sổ từ vựng" card (illustration, counters, ring, CTA) and the quote card. */
export function VideoSidebar({
  isGuest,
  vocabCount,
  reviewedPercent,
  vocabHref = DEFAULT_VOCAB_HREF,
}: VideoSidebarProps) {
  const navigate = useNavigate();
  const formattedCount = vocabCount === null ? "—" : formatCount(vocabCount);
  const target = isGuest ? `/login?next=${encodeURIComponent(vocabHref)}` : vocabHref;

  return (
    <aside className={styles.column}>
      <div className={styles.vocabCard}>
        <div className={styles.illustrationBox}>
          <img
            src={vocabIllustration}
            alt="Oysteic học từ vựng TOEIC Space"
            className={styles.illustration}
          />
        </div>

        {isGuest ? (
          <p className={styles.guestNote}>
            Bấm vào từ bất kỳ trong phụ đề để lưu vào sổ, rồi ôn lại bằng thẻ ghi nhớ.
          </p>
        ) : (
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{formattedCount}</div>
              <div className={styles.statLabel}>Từ vựng đã lưu</div>
            </div>

            <div className={styles.stat}>
              <div className={styles.ringWrap}>
                <svg viewBox="0 0 36 36" className={styles.ring} aria-hidden="true">
                  <path
                    className={styles.ringTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.ringFill}
                    strokeDasharray={`${reviewedPercent || 0}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className={styles.ringPercent}>
                  {reviewedPercent === null ? "—" : `${reviewedPercent}%`}
                </span>
              </div>
              <div className={styles.statLabel}>Đã ôn tập</div>
            </div>
          </div>
        )}

        <button type="button" className={styles.notebookButton} onClick={() => navigate(target)}>
          <Bookmark size={17} className={styles.bookmarkIcon} />
          {isGuest ? "Đăng nhập để mở sổ từ vựng" : "Xem sổ từ vựng"}
        </button>
      </div>

      <div className={styles.quoteCard}>
        <img src={quoteBackground} alt="" className={styles.quoteBackground} />

        <div className={styles.quoteContent}>
          <div className={styles.quoteMark}>“</div>
          <blockquote className={styles.quoteText}>
            “Học một chút mỗi ngày,
            <br />
            tiến bộ mỗi ngày.”
          </blockquote>
        </div>
      </div>
    </aside>
  );
}
