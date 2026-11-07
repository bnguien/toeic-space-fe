import type { MouseEvent } from "react";
import { Link } from "react-router-dom";

import { IconChevronRight, IconExams } from "@/shared/components/icons";
import type { Exam } from "../../types/exam-bank.types";
import { STATUS_LABELS } from "./bank.constants";
import styles from "./ExamLibrary.module.css";

/**
 * Exam card. A plain click opens the summary drawer; modified clicks keep the link behaviour,
 * so an exam can still be opened in a new tab.
 */
export function ExamLibraryItem({ exam, onOpen }: { exam: Exam; onOpen: (exam: Exam) => void }) {
  const total = exam.totalListeningQuestions + exam.totalReadingQuestions;
  const listeningPercent = total > 0 ? (exam.totalListeningQuestions / total) * 100 : 50;

  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    onOpen(exam);
  };

  return (
    <Link
      className={styles.exam}
      data-style="ocean"
      to={`/admin/exams/list/${encodeURIComponent(exam.id)}/part-1`}
      onClick={open}
    >
      <span className={styles.cover} aria-hidden="true">
        <IconExams size={19} />
      </span>

      <span className={styles.status} data-status={exam.status}>
        {STATUS_LABELS[exam.status] ?? exam.status}
      </span>

      <div className={styles.identity}>
        <h2 title={exam.title}>{exam.title}</h2>
      </div>

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

      <span className={styles.open}>
        <span>Xem chi tiết</span>
        <IconChevronRight size={15} />
      </span>
    </Link>
  );
}
