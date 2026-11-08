import { ArrowLeft, RotateCcw, Star, Timer } from "lucide-react";

import { cx } from "@/shared/components/ui";
import { formatClock } from "@/shared/utils/dictation-check";

import { MASCOT } from "../../utils/mascot";
import buttons from "./PlayButtons.module.css";
import styles from "./DictationPlaySession.module.css";
import type { PlayRow } from "./TocDrawer";

export interface FinishSummary {
  stars: number;
  elapsed: number;
  /** Study seconds today. */
  today: number;
}

interface FinishScreenProps {
  title: string;
  rows: PlayRow[];
  summary: FinishSummary;
  onReview: ((indexes: number[]) => void) | null;
  onRestart: () => void;
  onExit: () => void;
}

/** End of a stage: stars, clean / helped / revealed counts, time, sentences to review. */
export function FinishScreen({
  title,
  rows,
  summary,
  onReview,
  onRestart,
  onExit,
}: FinishScreenProps) {
  const clean = rows.filter((r) => r.status === "clean").length;
  const passed = rows.filter((r) => r.status === "passed").length;
  const missed = rows.filter((r) => r.status === "revealed");
  const average = rows.length ? summary.elapsed / rows.length : 0;
  return (
    <section className={styles.finish} data-play-panel="">
      <img src={MASCOT.cheer} alt="Oysteic chúc mừng" />
      <h2>Hoàn thành {title ? `“${title}”` : "màn này"}</h2>
      <div className={styles.stars} aria-label={`${summary.stars} trên 3 sao`}>
        {[1, 2, 3].map((n) => (
          <Star
            key={n}
            size={34}
            className={n <= summary.stars ? styles.starOn : undefined}
            fill={n <= summary.stars ? "currentColor" : "none"}
          />
        ))}
      </div>
      <div className={styles.finishStats}>
        <div>
          <strong>{clean}</strong>
          <span>câu sạch</span>
        </div>
        <div>
          <strong>{passed}</strong>
          <span>có trợ giúp</span>
        </div>
        <div>
          <strong>{missed.length}</strong>
          <span>xem đáp án</span>
        </div>
        <div>
          <strong>
            <Timer size={18} /> {formatClock(summary.elapsed)}
          </strong>
          <span>~{Math.max(1, Math.round(average))} giây/câu</span>
        </div>
      </div>
      <p className={styles.finishText}>
        Hôm nay bạn đã luyện nghe – viết <b>{Math.max(1, Math.round(summary.today / 60))} phút</b>.{" "}
        {summary.stars < 3
          ? "Đạt sạch từ 80% số câu để lấy 3 sao."
          : "Tuyệt vời, giữ nhịp này nhé!"}
      </p>
      {missed.length > 0 && (
        <div className={styles.finishMissed}>
          <span>Câu cần ôn</span>
          {missed.slice(0, 8).map((r) => (
            <p key={r.key}>
              <b>{r.sentence}</b>
              <small>{r.translation}</small>
            </p>
          ))}
        </div>
      )}
      <div className={buttons.actions}>
        {onReview && missed.length > 0 && (
          <button
            type="button"
            className={cx(buttons.button, buttons.primary)}
            onClick={() => onReview(missed.map((r) => r.i))}
          >
            <RotateCcw size={16} /> Ôn lại {missed.length} câu chưa thuộc
          </button>
        )}
        <button
          type="button"
          className={cx(buttons.button, !(onReview && missed.length) && buttons.primary)}
          onClick={onRestart}
        >
          <RotateCcw size={16} /> Làm lại cả màn
        </button>
        <button type="button" className={buttons.button} onClick={onExit}>
          <ArrowLeft size={16} /> Về bản đồ
        </button>
      </div>
    </section>
  );
}
