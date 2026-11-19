import { useEffect, useId, useState, type ReactNode } from "react";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";

import { Select, type SelectOption } from "@/shared/components/Select";
import { usePopover } from "@/shared/hooks/usePopover";

import { cx } from "../types";
import styles from "./DataToolbar.module.css";

export interface FilterField {
  key: string;
  label: string;
  /** Empty string means "no filter". */
  value: string;
  options: SelectOption[];
}

export interface ToolbarAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export interface DataToolbarProps {
  /** Omit `onSearch` to hide the search box. */
  search?: string;
  onSearch?: (value: string) => void;
  placeholder?: string;
  filters?: FilterField[];
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
  /** Extra commands listed under "Thao tác" after the filter toggle (export, refresh, ...). */
  actions?: ToolbarAction[];
  /** Controls shown before the search box, e.g. tabs. */
  leading?: ReactNode;
  /** Controls shown after the "Thao tác" menu, e.g. a primary button. */
  trailing?: ReactNode;
  className?: string;
}

const SEARCH_DELAY = 350;

/**
 * The same toolbar on every list (admin and learner): one search box and one "Thao tác" menu
 * that holds the filters and the page commands, plus removable chips for the filters in use.
 */
export function DataToolbar({
  search = "",
  onSearch,
  placeholder = "Tìm kiếm",
  filters = [],
  onFilterChange,
  onClearFilters,
  actions = [],
  leading,
  trailing,
  className,
}: DataToolbarProps) {
  const [draft, setDraft] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { open, toggle, close, anchorRef, triggerRef } = usePopover();
  const menuId = useId();

  // The caller (often the URL) is the source of truth: follow it when it changes elsewhere.
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setDraft(search);
  }

  // Search as the user types, once they pause.
  useEffect(() => {
    if (!onSearch) return;
    const value = draft.trim();
    if (value === search) return;
    const timer = window.setTimeout(() => onSearch(value), SEARCH_DELAY);
    return () => window.clearTimeout(timer);
  }, [draft, search, onSearch]);

  const activeFilters = filters.filter((filter) => filter.value);
  const hasMenu = filters.length > 0 || actions.length > 0;

  return (
    <div className={cx(styles.toolbar, className)}>
      <div className={styles.toolbarRow}>
        {leading}
        {onSearch && (
          <form
            className={styles.search}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              onSearch(draft.trim());
            }}
          >
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              maxLength={100}
            />
            {draft && (
              <button
                type="button"
                className={styles.clear}
                aria-label="Xoá từ khoá"
                title="Xoá từ khoá"
                onClick={() => {
                  setDraft("");
                  onSearch("");
                }}
              >
                <X size={15} />
              </button>
            )}
          </form>
        )}

        {hasMenu && (
          <div className={styles.popoverAnchor} ref={anchorRef}>
            <button
              ref={triggerRef}
              type="button"
              className={styles.trigger}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={toggle}
            >
              <SlidersHorizontal size={16} />
              <span>Thao tác</span>
              {activeFilters.length > 0 && <b className={styles.counter}>{activeFilters.length}</b>}
            </button>
            {open && (
              <div className={styles.menu} id={menuId} role="menu">
                {filters.length > 0 && (
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={filtersOpen}
                    className={styles.menuItem}
                    onClick={() => {
                      setFiltersOpen((value) => !value);
                      close();
                    }}
                  >
                    <Filter size={16} />
                    {filtersOpen ? "Ẩn bộ lọc" : "Bộ lọc"}
                    {activeFilters.length > 0 && (
                      <b className={styles.counter}>{activeFilters.length}</b>
                    )}
                  </button>
                )}
                {filters.length > 0 && actions.length > 0 && (
                  <div className={styles.menuDivider} role="separator" />
                )}
                {actions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    disabled={action.disabled}
                    onClick={() => {
                      close();
                      action.onSelect();
                    }}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {trailing}
      </div>

      {filtersOpen && filters.length > 0 && (
        <div className={styles.filterPanel}>
          {filters.map((filter) => (
            <div key={filter.key} className={styles.filterField}>
              <span>{filter.label}</span>
              <Select
                aria-label={filter.label}
                value={filter.value}
                options={filter.options}
                onChange={(value) => onFilterChange?.(filter.key, value)}
              />
            </div>
          ))}
          {activeFilters.length > 0 && onClearFilters && (
            <button type="button" className={styles.ghost} onClick={onClearFilters}>
              Xoá bộ lọc
            </button>
          )}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className={styles.chips} aria-label="Bộ lọc đang dùng">
          {activeFilters.map((filter) => (
            <span key={filter.key} className={styles.chip}>
              {filter.label}:{" "}
              {filter.options.find((option) => option.value === filter.value)?.label ??
                filter.value}
              <button
                type="button"
                aria-label={`Bỏ lọc ${filter.label}`}
                onClick={() => onFilterChange?.(filter.key, "")}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
