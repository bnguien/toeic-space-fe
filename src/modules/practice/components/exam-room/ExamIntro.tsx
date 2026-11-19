import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock, Headphones, Play, Volume2 } from "lucide-react";

import { Button } from "@/shared/components/ui";

import { playBeep } from "../../utils/examAudio";
import styles from "./ExamRoom.module.css";

export interface ExamIntroProps {
  title: string;
  total: number;
  minutes: number;
  listeningCount: number;
  readingCount: number;
  volume: number;
  onVolume: (volume: number) => void;
  onStart: () => void;
  backTo: string;
  /** Extra line above the start button (restart warning). */
  note?: ReactNode;
  starting?: boolean;
}

/** Exam intro (port of StudyChill ExamIntro): title, counts, the four rules, volume test, start. */
export function ExamIntro({
  title,
  total,
  minutes,
  listeningCount,
  readingCount,
  volume,
  onVolume,
  onStart,
  backTo,
  note,
  starting = false,
}: ExamIntroProps) {
  const volumeId = useId();
  return (
    <div className={styles.centerScroll}>
      <section className={styles.card} aria-labelledby="exam-intro-title">
        <Link to={backTo} className={styles.back}>
          <ArrowLeft size={15} aria-hidden="true" /> Về Luyện đề
        </Link>
        <span className={styles.kicker}>
          <Clock size={15} aria-hidden="true" /> Thi thử · mô phỏng phòng thi máy tính
        </span>
        <h1 id="exam-intro-title" className={styles.title}>
          {title}
        </h1>
        <p className={styles.meta}>
          <strong>{total} câu</strong> · <strong>{minutes} phút</strong>
          <span className={styles.metaSplit}>
            <span data-section="listening">
              <Headphones size={14} aria-hidden="true" /> Listening {listeningCount}
            </span>
            <span data-section="reading">
              <BookOpen size={14} aria-hidden="true" /> Reading {readingCount}
            </span>
          </span>
        </p>
        <ol className={styles.rules}>
          <li>
            Audio mỗi phần <strong>phát một lần</strong>, không dừng, tua hay nghe lại — như phòng
            thi thật.
          </li>
          <li>
            Hết audio có vài giây để chọn đáp án rồi tự sang nhóm câu sau;{" "}
            <strong>không quay lại</strong> câu Listening đã qua.
          </li>
          <li>
            Phần Reading đi lại tự do, có bảng câu hỏi và nút <strong>Đánh dấu xem lại</strong>.
          </li>
          <li>
            Một đồng hồ {minutes} phút cho cả bài; <strong>hết giờ tự nộp</strong>. Bài làm tự lưu,
            tải lại trang vẫn làm tiếp.
          </li>
        </ol>
        <div className={styles.volumeTest}>
          <label className={styles.volume} htmlFor={volumeId}>
            <Volume2 size={16} aria-hidden="true" />
            <span>Âm lượng</span>
            <input
              id={volumeId}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => onVolume(Number(event.target.value))}
            />
            <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            icon={<Play size={14} aria-hidden="true" />}
            onClick={() => playBeep(volume)}
          >
            Thử âm thanh
          </Button>
        </div>
        {note && <p className={styles.introNote}>{note}</p>}
        <Button variant="primary" size="lg" block onClick={onStart} disabled={starting}>
          {starting ? "Đang chuẩn bị phòng thi…" : "Bắt đầu làm bài"}
        </Button>
      </section>
    </div>
  );
}
