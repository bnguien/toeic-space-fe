import { useId, useMemo, type KeyboardEvent, type ReactNode } from "react";
import { Columns3 } from "lucide-react";

import { Button, IconButton } from "./Button";
import { EmptyState } from "./EmptyState";
import { Pagination, type PaginationProps } from "./Pagination";
import { useColumnVisibility } from "./useColumnVisibility";
import { usePopover } from "./usePopover";
import styles from "./ui.module.css";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hidden until the user turns it on from the column menu. */
  defaultHidden?: boolean;
  /** The identifying column cannot be hidden. */
  locked?: boolean;
  align?: "left" | "right" | "center";
  nowrap?: boolean;
}

interface DataTableProps<T> {
  /** Stable name used to remember the visible columns. */
  id: string;
  label: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  activeRowId?: string | null;
  loading?: boolean;
  fetching?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: ReactNode;
  pagination?: PaginationProps;
  /** Left side of the bar above the table; defaults to the result count. */
  summary?: ReactNode;
}

const SKELETON_ROWS = 6;

export function DataTable<T>({
  id,
  label,
  columns,
  rows,
  getRowId,
  onRowClick,
  activeRowId,
  loading = false,
  fetching = false,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  pagination,
  summary,
}: DataTableProps<T>) {
  const defaultHidden = useMemo(
    () => columns.filter((column) => column.defaultHidden).map((column) => column.key),
    [columns],
  );
  const visibility = useColumnVisibility(id, defaultHidden);
  const { open, toggle, anchorRef, triggerRef } = usePopover();
  const menuId = useId();
  const visible = columns.filter(
    (column) => column.locked || !visibility.hidden.includes(column.key),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  const total = pagination?.total ?? rows?.length ?? 0;

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableBar}>
        <span>
          {summary ?? (
            <>
              <strong>{loading ? "…" : total.toLocaleString("vi-VN")}</strong> kết quả
            </>
          )}
        </span>
        <div className={styles.popoverAnchor} ref={anchorRef}>
          <IconButton
            ref={triggerRef}
            label="Ẩn / hiện cột"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={toggle}
          >
            <Columns3 size={17} />
          </IconButton>
          {open && (
            <div className={styles.menu} id={menuId} role="group" aria-label="Cột hiển thị">
              <div className={styles.menuLabel}>Cột hiển thị</div>
              {columns.map((column) => (
                <label
                  key={column.key}
                  className={styles.checkItem}
                  data-locked={column.locked ? "true" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={column.locked || !visibility.hidden.includes(column.key)}
                    disabled={column.locked}
                    onChange={() => visibility.toggle(column.key)}
                  />
                  {column.header}
                </label>
              ))}
              <div className={styles.menuDivider} role="separator" />
              <Button variant="ghost" size="sm" onClick={visibility.reset}>
                Mặc định
              </Button>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <EmptyState
          title="Chưa tải được dữ liệu"
          description={error}
          action={
            onRetry && (
              <Button size="sm" onClick={onRetry}>
                Thử lại
              </Button>
            )
          }
        />
      ) : !loading && rows?.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className={styles.tableScroll} aria-busy={fetching || loading}>
          <table className={styles.table} aria-label={label}>
            <thead>
              <tr>
                {visible.map((column) => (
                  <th key={column.key} scope="col" data-align={column.align}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading || !rows
                ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <tr key={index} className={`${styles.row} ${styles.skeletonRow}`}>
                      {visible.map((column) => (
                        <td key={column.key}>
                          <span className={styles.skeleton} />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row) => {
                    const rowId = getRowId(row);
                    return (
                      <tr
                        key={rowId}
                        className={styles.row}
                        data-clickable={onRowClick ? "true" : undefined}
                        aria-selected={onRowClick ? activeRowId === rowId : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        onKeyDown={onRowClick ? (event) => onKeyDown(event, row) : undefined}
                      >
                        {visible.map((column) => (
                          <td
                            key={column.key}
                            data-align={column.align}
                            data-nowrap={column.nowrap ? "true" : undefined}
                          >
                            {column.render(row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !error && rows && rows.length > 0 && <Pagination {...pagination} />}
    </div>
  );
}
