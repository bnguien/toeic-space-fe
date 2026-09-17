import { Link } from "react-router-dom";
import { IconChevronRight, IconExams } from "@/shared/components/icons";
import type { Exam } from "../../types/exam-bank.types";
import { STATUS_LABELS } from "./bank.constants";
import styles from "./ExamLibrary.module.css";

export function ExamLibraryItem({ exam, index = 0 }: { exam: Exam; index?: number }) {
  const col = (index % 4) + 1;
  const styleTheme = col === 1 || col === 3 ? "ocean" : "rose";

  const total = exam.totalListeningQuestions + exam.totalReadingQuestions;
  const listeningPercent = total > 0 ? (exam.totalListeningQuestions / total) * 100 : 50;

  return (
    <Link
      className={styles.exam}
      data-style={styleTheme}
      data-col={col}
      to={`/admin/exams/list/${encodeURIComponent(exam.id)}/part-1`}
    >
      {/* 1. Header: Icon tài liệu như cũ + Trạng thái */}
      <span className={styles.cover} aria-hidden="true">
        <IconExams size={19} />
      </span>

      <span className={styles.status} data-status={exam.status}>
        {STATUS_LABELS[exam.status] ?? exam.status}
      </span>

      {/* 2. Tiêu đề gọn gàng (đã xóa tag lặp lại) */}
      <div className={styles.identity}>
        <h2 title={exam.title}>{exam.title}</h2>
      </div>

      {/* 3. Thông số gọn gàng */}
      <div className={styles.metrics}>
        <div className={styles.metricItem}>
          <span className={styles.metricValue}>{exam.durationMinutes}</span>
          <span className={styles.metricLabel}>phút</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricValue}>{exam.totalQuestions}</span>
          <span className={styles.metricLabel}>câu</span>
        </div>
      </div>

      {/* 4. Thanh phân bổ LC / RC */}
      <div className={styles.distribution}>
        <div
          className={styles.track}
          role="img"
          aria-label={`${exam.totalListeningQuestions} LC, ${exam.totalReadingQuestions} RC`}
        >
          <span style={{ width: `${listeningPercent}%` }} />
          <span style={{ width: `${total > 0 ? 100 - listeningPercent : 50}%` }} />
        </div>
        <div className={styles.legend}>
          <span className={styles.legendLc}>
            <i /> LC <b>{exam.totalListeningQuestions}</b>
          </span>
          <span className={styles.legendRc}>
            <i /> RC <b>{exam.totalReadingQuestions}</b>
          </span>
        </div>
      </div>

      {/* 5. Nút xem câu hỏi */}
      <span className={styles.open}>
        <span>Xem câu hỏi</span>
        <IconChevronRight size={15} />
      </span>
    </Link>
  );
}
