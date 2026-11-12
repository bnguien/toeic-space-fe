import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ForwardedRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, ChevronDown, X } from "lucide-react";

import styles from "./Select.module.css";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  id?: string;
  name?: string;
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  clearable?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select<
  T extends string = string,
>(
  {
    id,
    name,
    value: controlledValue,
    defaultValue,
    onChange,
    options,
    placeholder = "-- Chọn --",
    disabled = false,
    error = false,
    clearable = false,
    className,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
  }: SelectProps<T>,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const [internalValue, setInternalValue] = useState<T | undefined>(
    defaultValue !== undefined ? defaultValue : undefined,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const internalButtonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue : internalValue;

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Sync focused index when opening
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === selectedValue);
      setFocusedIndex(idx >= 0 ? idx : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, options, selectedValue]);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listboxRef.current) {
      const itemElement = listboxRef.current.children[focusedIndex] as HTMLElement | undefined;
      if (itemElement) {
        itemElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;

    if (!isControlled) {
      setInternalValue(option.value);
    }
    onChange?.(option.value);
    setIsOpen(false);
    (forwardedRef && typeof forwardedRef !== "function"
      ? forwardedRef.current
      : internalButtonRef.current
    )?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!isControlled) {
      setInternalValue("" as T);
    }
    onChange?.("" as T);
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setFocusedIndex((prev) => {
          const next = prev + 1;
          return next < options.length ? next : 0;
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setFocusedIndex((prev) => {
          const next = prev - 1;
          return next >= 0 ? next : options.length - 1;
        });
      }
    } else if (e.key === "Enter" || e.key === " ") {
      if (isOpen && focusedIndex >= 0) {
        e.preventDefault();
        const opt = options[focusedIndex];
        if (opt && !opt.disabled) {
          handleSelect(opt);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "Tab") {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  const hasError = Boolean(error);

  return (
    <div ref={containerRef} className={`${styles.selectWrapper} ${className || ""}`}>
      {/* Hidden input for standard HTML form compatibility */}
      {name && <input type="hidden" name={name} value={selectedValue || ""} disabled={disabled} />}

      <button
        ref={(node) => {
          internalButtonRef.current = node;
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={hasError}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""} ${
          hasError ? styles.triggerError : ""
        } ${disabled ? styles.triggerDisabled : ""}`}
      >
        <span className={styles.selectedContent}>
          {selectedOption ? (
            <>
              {selectedOption.icon}
              <span className={styles.selectedLabel}>{selectedOption.label}</span>
            </>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>

        <span className={styles.iconGroup}>
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className={styles.clearButton}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              title="Xóa lựa chọn"
              aria-label="Xóa lựa chọn"
            >
              <X size={14} />
            </span>
          )}
          <span
            className={`${styles.chevron} ${isOpen ? styles.chevronRotated : ""}`}
            aria-hidden="true"
          >
            <ChevronDown size={16} />
          </span>
        </span>
      </button>

      {/* Dropdown Listbox */}
      {isOpen && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className={styles.dropdown}
          aria-label={ariaLabel || placeholder}
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isFocused = index === focusedIndex;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ""} ${
                  isFocused ? styles.optionFocused : ""
                } ${option.disabled ? styles.optionDisabled : ""}`}
              >
                <div className={styles.optionMain}>
                  <div className={styles.optionLabelRow}>
                    {option.icon}
                    <span className={styles.optionLabel}>{option.label}</span>
                  </div>
                  {option.description && (
                    <span className={styles.optionDescription}>{option.description}</span>
                  )}
                </div>

                {isSelected && (
                  <span className={styles.checkIcon} aria-hidden="true">
                    <Check size={16} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
