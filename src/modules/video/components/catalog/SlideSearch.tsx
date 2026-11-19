import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { cx } from "@/shared/components/ui";

import styles from "./SlideSearch.module.css";

export interface SlideSearchProps {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  onToggle: () => void;
  placeholder: string;
  toggleTitle: string;
}

/** Search box that slides open to the left of its toggle button; focuses itself 150 ms after opening. */
export function SlideSearch({
  open,
  query,
  onQueryChange,
  onClear,
  onToggle,
  placeholder,
  toggleTitle,
}: SlideSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className={cx(styles.container, open && styles.isOpen)}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {query && (
        <button type="button" className={styles.clear} onClick={onClear} title="Xóa tìm kiếm">
          <X size={13} />
        </button>
      )}
      <button
        type="button"
        className={cx(styles.toggle, open && styles.active)}
        onClick={onToggle}
        title={toggleTitle}
      >
        <Search size={16} />
      </button>
    </div>
  );
}
