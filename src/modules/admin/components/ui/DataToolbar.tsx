import { useEffect, useId, useState, type ReactNode } from "react";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";

import { Select, type SelectOption } from "@/shared/components/Select";
import { Button, IconButton } from "./Button";
import { usePopover } from "./usePopover";
import styles from "./ui.module.css";

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

interface DataToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  filters?: FilterField[];
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
  /** Extra commands listed under "Thao tác" after the filter toggle (export, refresh, ...). */
  actions?: ToolbarAction[];
  /** Controls shown before the search box, e.g. tabs. */
  leading?: ReactNode;
}

const SEARCH_DELAY = 350;

/**
 * The same toolbar on every list: one search box and one "Thao tác" menu that holds the
 * filters and the page commands, plus removable chips for the filters in use.
 */
export function DataToolbar({
  search,
  onSearch,
  placeholder,
  filters = [],
  onFilterChange,
  onClearFilters,
  actions = [],
  leading,
}: DataToolbarProps) {
  const [draft, setDraft] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { open, toggle, close, anchorRef, triggerRef } = usePopover();
  const menuId = useId();

  // The URL is the source of truth: follow it when it changes elsewhere (back button, links).
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setDraft(search);
  }

  // Search as the user types, once they pause.
  useEffect(() => {
    const value = draft.trim();
    if (value === search) return;
    const timer = window.setTimeout(() => onSearch(value), SEARCH_DELAY);
    return () => window.clearTimeout(timer);
  }, [draft, search, onSearch]);

  const activeFilters = filters.filter((filter) => filter.value);
  const hasMenu = filters.length > 0 || actions.length > 0;

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        {leading}
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
            <IconButton
              label="Xoá từ khoá"
              onClick={() => {
                setDraft("");
                onSearch("");
              }}
            >
              <X size={15} />
            </IconButton>
          )}
        </form>

        {hasMenu && (
          <div className={styles.popoverAnchor} ref={anchorRef}>
            <Button
              ref={triggerRef}
              className={styles.actionsTrigger}
              icon={<SlidersHorizontal size={16} />}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={toggle}
            >
              <span>Thao tác</span>
              {activeFilters.length > 0 && <b className={styles.counter}>{activeFilters.length}</b>}
            </Button>
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
            <Button variant="ghost" onClick={onClearFilters}>
              Xoá bộ lọc
            </Button>
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

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; count?: number; icon?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
          {option.count !== undefined && <span>{option.count.toLocaleString("vi-VN")}</span>}
        </button>
      ))}
    </div>
  );
}
