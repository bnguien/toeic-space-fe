import { ChevronLeft, ChevronRight } from "lucide-react";

import { cx } from "@/shared/components/ui";

import styles from "./RefPagination.module.css";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const pages = (total: number) => Array.from({ length: total }, (_, index) => index + 1);

/** Compact arrows + number pills in the "Video tham khảo" header (only when more than one page). */
export function HeaderPagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className={styles.header}>
      <button
        type="button"
        className={styles.headerArrow}
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        title="Trang trước"
      >
        <ChevronLeft size={15} />
      </button>

      <div className={styles.headerPills}>
        {pages(totalPages).map((pageNumber) => (
          <button
            key={`head-page-${pageNumber}`}
            type="button"
            className={cx(styles.headerPage, page === pageNumber && styles.active)}
            onClick={() => onChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.headerArrow}
        disabled={page === totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        title="Trang sau"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

/** Bottom bar "Trang trước · 1 2 3 · Trang sau" under the grid (only when more than one page). */
export function PaginationBar({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.navButton}
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        <ChevronLeft size={16} /> Trang trước
      </button>

      <div className={styles.numbers}>
        {pages(totalPages).map((pageNumber) => (
          <button
            key={`page-bottom-${pageNumber}`}
            type="button"
            className={cx(styles.numberButton, page === pageNumber && styles.active)}
            onClick={() => onChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.navButton}
        disabled={page === totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      >
        Trang sau <ChevronRight size={16} />
      </button>
    </div>
  );
}
