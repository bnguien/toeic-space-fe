import type { ReactNode } from "react";

import { Badge, DataToolbar, type FilterField } from "@/shared/components/ui";

import { formatCount } from "../utils/vocabulary-format";
import styles from "./LibraryHeader.module.css";

/** Client-side status filter over the loaded page; values are `describeProgress` labels. */
const STATUS_OPTIONS: FilterField["options"] = [
  { value: "", label: "Tất cả" },
  { value: "Mới", label: "Mới" },
  { value: "Đang học", label: "Đang học" },
  { value: "Đã thuộc", label: "Đã thuộc" },
  { value: "Đến hạn", label: "Đến hạn" },
];

interface LibraryHeaderProps {
  /** Id of the title, for the section's `aria-labelledby`. */
  titleId: string;
  title: string;
  count: number;
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  /** Primary command after the toolbar menu, e.g. "Thêm từ". */
  trailing?: ReactNode;
}

/** One row on every "Của tôi" view: title · count · search, status filter and commands. */
export function LibraryHeader({
  titleId,
  title,
  count,
  search,
  onSearch,
  status,
  onStatusChange,
  trailing,
}: LibraryHeaderProps) {
  return (
    <div className={styles.head}>
      <h1 id={titleId} className={styles.title}>
        {title}
      </h1>
      <Badge size="md">{formatCount(count)} từ</Badge>
      <DataToolbar
        className={styles.toolbar}
        search={search}
        onSearch={onSearch}
        placeholder="Tìm từ hoặc nghĩa"
        filters={[{ key: "status", label: "Trạng thái", value: status, options: STATUS_OPTIONS }]}
        onFilterChange={(_, value) => onStatusChange(value)}
        onClearFilters={() => onStatusChange("")}
        trailing={trailing}
      />
    </div>
  );
}
