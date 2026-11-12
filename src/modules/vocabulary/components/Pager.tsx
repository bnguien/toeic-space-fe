import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/shared/components/ui";

import styles from "./Pager.module.css";

interface PagerProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** ‹ 2/5 › under a paged list; hidden when there is one page. */
export function Pager({ page, pageCount, onChange }: PagerProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className={styles.pager} aria-label="Trang">
      <IconButton
        label="Trang trước"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </IconButton>
      <span className={styles.label}>
        {page}/{pageCount}
      </span>
      <IconButton
        label="Trang sau"
        variant="outline"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </IconButton>
    </nav>
  );
}
