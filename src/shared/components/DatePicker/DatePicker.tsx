import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import styles from "./DatePicker.module.css";

interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: boolean | string;
  className?: string;
  "aria-describedby"?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");
const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseIsoDate = (value?: string) => (value ? new Date(`${value}T00:00:00`) : null);
const sameDate = (left: Date, right: Date) => toIsoDate(left) === toIsoDate(right);
const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function DatePicker({
  id,
  name,
  value = "",
  onChange,
  placeholder = "dd/mm/yyyy",
  min,
  max,
  disabled = false,
  error = false,
  className,
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  const generatedId = useId();
  const pickerId = id || generatedId;
  const selectedDate = parseIsoDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const source = selectedDate || new Date();
    return new Date(source.getFullYear(), source.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const days = useMemo(() => {
    const firstDay = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(start.getDate() - leadingDays);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [displayedMonth]);

  const choose = (date: Date) => {
    const next = toIsoDate(date);
    if ((min && next < min) || (max && next > max)) return;
    onChange?.(next);
    setIsOpen(false);
  };
  const clear = () => {
    onChange?.("");
    setIsOpen(false);
  };
  const today = () => {
    const now = new Date();
    setDisplayedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    choose(now);
  };
  const formattedValue = selectedDate
    ? new Intl.DateTimeFormat("vi-VN").format(selectedDate)
    : placeholder;
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" })
    .format(displayedMonth)
    .replace(/^./, (letter) => letter.toUpperCase());
  const todayDate = new Date();

  return (
    <div ref={containerRef} className={`${styles.wrapper} ${className || ""}`}>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      <button
        id={pickerId}
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""} ${error ? styles.triggerError : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-describedby={ariaDescribedBy}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={selectedDate ? styles.value : styles.placeholder}>{formattedValue}</span>
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Chọn ngày">
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() =>
                setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              className={styles.navButton}
              onClick={() =>
                setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className={styles.weekdays}>
            {weekdayLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className={styles.days}>
            {days.map((day) => {
              const iso = toIsoDate(day);
              const outside = day.getMonth() !== displayedMonth.getMonth();
              const unavailable = (min && iso < min) || (max && iso > max);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={Boolean(unavailable)}
                  onClick={() => choose(day)}
                  className={`${styles.day} ${outside ? styles.outside : ""} ${selectedDate && sameDate(day, selectedDate) ? styles.selected : ""} ${sameDate(day, todayDate) ? styles.today : ""}`}
                  aria-label={new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className={styles.footer}>
            <button type="button" onClick={clear} disabled={!value}>
              <X size={15} /> Xóa
            </button>
            <button type="button" onClick={today}>
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
