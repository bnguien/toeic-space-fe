import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { Plus } from "lucide-react";
import formStyles from "./CourseFormModal.module.css";

export interface CourseTagInputProps {
  label: string;
  items: string[];
  maxItems: number;
  maxItemLength?: number;
  placeholder?: string;
  onChange: (items: string[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function CourseTagInput({
  label,
  items,
  maxItems,
  maxItemLength = 300,
  placeholder,
  onChange,
  onError,
  disabled = false,
}: CourseTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTags = (rawText: string) => {
    if (!rawText.trim() || disabled) return;

    // Split by newlines in case multi-line text is pasted or entered
    const lines = rawText.split(/\r?\n+/);
    const toAdd: string[] = [];
    let duplicateFound = false;
    let limitReached = false;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const candidate = trimmed.slice(0, maxItemLength);
      const candidateLower = candidate.toLowerCase();

      const isDuplicate =
        items.some((it) => it.toLowerCase() === candidateLower) ||
        toAdd.some((it) => it.toLowerCase() === candidateLower);

      if (isDuplicate) {
        duplicateFound = true;
        continue;
      }

      if (items.length + toAdd.length >= maxItems) {
        limitReached = true;
        break;
      }

      toAdd.push(candidate);
    }

    if (toAdd.length > 0) {
      onChange([...items, ...toAdd]);
      setInputValue("");
    } else {
      setInputValue("");
    }

    if (limitReached && onError) {
      onError(`Tối đa ${maxItems} mục cho ${label.toLowerCase()}.`);
    } else if (duplicateFound && toAdd.length === 0 && onError) {
      onError(`Mục này đã tồn tại trong danh sách ${label.toLowerCase()}.`);
    }

    // Keep input focused
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Prevent form submission and add tag
      e.preventDefault();
      addTags(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && items.length > 0) {
      // Backspace on empty input removes the last tag
      e.preventDefault();
      const updated = items.slice(0, -1);
      onChange(updated);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.includes("\n") || text.includes("\r")) {
      e.preventDefault();
      addTags(text);
    }
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
    inputRef.current?.focus();
  };

  return (
    <div className={formStyles.tagSection}>
      <div className={formStyles.tagHeader}>
        <span>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {items.length > 0 && !disabled && (
            <button
              type="button"
              className={formStyles.clearAllButton}
              onClick={() => {
                onChange([]);
                inputRef.current?.focus();
              }}
            >
              Xóa tất cả
            </button>
          )}
          <span className={formStyles.tagCount}>
            {items.length}/{maxItems}
          </span>
        </div>
      </div>

      <div className={formStyles.tagInputRow}>
        <input
          ref={inputRef}
          value={inputValue}
          maxLength={maxItemLength}
          placeholder={placeholder}
          disabled={disabled || items.length >= maxItems}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <button
          type="button"
          className={formStyles.tagAddButton}
          onClick={() => addTags(inputValue)}
          disabled={disabled || !inputValue.trim() || items.length >= maxItems}
        >
          <Plus size={14} /> Thêm
        </button>
      </div>

      <div className={formStyles.chipList}>
        {items.map((item, index) => (
          <span key={index} className={formStyles.chip} title={item}>
            <span className={formStyles.chipText}>{item}</span>
            <button
              type="button"
              className={formStyles.chipRemove}
              onClick={() => handleRemove(index)}
              disabled={disabled}
              aria-label={`Xóa ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
