import { ChevronLeft, ChevronRight } from "lucide-react";

import styles from "./ui.module.css";

/** Page numbers around the current page, with gaps marked as null: 1 … 4 5 6 … 20. */
function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);

  const around = [page - 1, page, page + 1].filter((value) => value > 1 && value < pages);
  const result: (number | null)[] = [1];
  if (around[0] > 2) result.push(null);
  result.push(...around);
  if (around[around.length - 1] < pages - 1) result.push(null);
  result.push(pages);
  return result;
}

export interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pages, total, pageSize, onChange }: PaginationProps) {
  const lastPage = Math.max(1, pages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className={styles.pagination} aria-label="Phân trang">
      <span>
        {from.toLocaleString("vi-VN")}–{to.toLocaleString("vi-VN")} /{" "}
        {total.toLocaleString("vi-VN")}
      </span>
      {lastPage > 1 && (
        <div className={styles.pages}>
          <button
            type="button"
            className={styles.pageButton}
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          {pageWindow(page, lastPage).map((value, index) =>
            value === null ? (
              <span key={`gap-${index}`} className={styles.pageGap} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={value}
                type="button"
                className={styles.pageButton}
                aria-current={value === page ? "page" : undefined}
                onClick={() => onChange(value)}
              >
                {value}
              </button>
            ),
          )}
          <button
            type="button"
            className={styles.pageButton}
            aria-label="Trang sau"
            disabled={page >= lastPage}
            onClick={() => onChange(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
