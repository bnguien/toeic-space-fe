import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import emptyImage from "@/assets/mascot/oy2-empty.png";
import { IconChevronLeft, IconChevronRight } from "@/shared/components/icons";
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
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return (
    <div className={styles.empty} role={error ? "alert" : "status"}>
      {!loading && <img src={emptyImage} alt="" width="92" height="92" />}
      <h3>
        {loading
          ? "Đang tải nội dung..."
          : error
            ? status === 401 || status === 403
              ? "Cần quyền quản lý nội dung"
              : "Chưa tải được dữ liệu"
            : empty}
      </h3>
      <p>
        {loading
          ? ""
          : error
            ? status === 401 || status === 403
              ? "Vui lòng đăng nhập bằng tài khoản quản trị."
              : "Không thể kết nối. Vui lòng thử lại sau."
            : description}
      </p>
      {Boolean(error) && retry && (
        <button className={styles.button} onClick={retry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className={styles.pagination}>
      <span>{total.toLocaleString("vi-VN")} kết quả</span>
      <div>
        <button
          className={styles.iconButton}
          aria-label="Trang trước"
          title="Trang trước"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <IconChevronLeft />
        </button>
        <span>
          {page} / {Math.max(1, pages)}
        </span>
        <button
          className={styles.iconButton}
          aria-label="Trang sau"
          title="Trang sau"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}
