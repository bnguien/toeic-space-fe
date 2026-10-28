import { Link } from "react-router-dom";

import emptyImage from "@/assets/mascot/oy2-empty.png";
import { apiErrorMessage } from "../../utils/apiError";
import styles from "./ExamBrowser.module.css";
import { PART_NAMES } from "./bank.constants";

export function PartNavigation({ part, testId }: { part?: number; testId?: string }) {
  return (
    <nav
      className={`${styles.parts} ${testId ? styles.examParts : ""}`}
      aria-label={testId ? "Các phần trong đề thi này" : "Các phần thi TOEIC"}
    >
      {PART_NAMES.map((name, index) => (
        <Link
          key={name}
          to={
            testId
              ? `/admin/exams/list/${encodeURIComponent(testId)}/part-${index + 1}`
              : `/admin/exams/part-${index + 1}`
          }
          aria-current={part === index + 1 ? "page" : undefined}
        >
          <span>Part {index + 1}</span>
          <small>{name}</small>
        </Link>
      ))}
    </nav>
  );
}

/** Loading, error and empty states inside the question preview. */
export function BankStatus({
  loading,
  error,
  retry,
  empty = "Chưa có câu hỏi",
  description = "Không có nội dung phù hợp với bộ lọc hiện tại.",
}: {
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
  empty?: string;
  description?: string;
}) {
  return (
    <div className={styles.empty} role={error ? "alert" : "status"}>
      {!loading && <img src={emptyImage} alt="" width="92" height="92" />}
      <h3>{loading ? "Đang tải nội dung..." : error ? "Chưa tải được dữ liệu" : empty}</h3>
      <p>{loading ? "" : error ? apiErrorMessage(error) : description}</p>
      {Boolean(error) && retry && (
        <button className={styles.button} onClick={retry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
