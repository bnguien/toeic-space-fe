import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";

import styles from "./DatePicker.module.css";
import timeStyles from "./DateTimePicker.module.css";

interface DateTimePickerProps {
  id?: string;
  value?: string; // ISO string or ""
  onChange?: (value: string) => void;
  placeholder?: string;
  min?: string; // ISO string
  max?: string; // ISO string
  disabled?: boolean;
  error?: boolean | string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sameDate = (a: Date, b: Date) => toIsoDate(a) === toIsoDate(b);
const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function parseIso(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function buildIso(date: Date, hour: number, minute: number): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function formatDisplay(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function DateTimePicker({
  id,
  value: controlledValue,
  onChange,
  placeholder = "dd/mm/yyyy hh:mm",
  min,
  max,
  disabled = false,
  error = false,
  className,
}: DateTimePickerProps) {
  const generatedId = useId();
  const pickerId = id ?? generatedId;
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");
  const value = controlledValue ?? internalValue;

  const parsed = useMemo(() => parseIso(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [monthState, setMonthState] = useState(() => ({
    value,
    month: (() => {
      const src = parsed ?? new Date();
      return new Date(src.getFullYear(), src.getMonth(), 1);
    })(),
  }));
  if (monthState.value !== value) {
    setMonthState({
      value,
      month: parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : monthState.month,
    });
  }
  const displayedMonth = monthState.month;
  const setDisplayedMonth = (next: Date | ((current: Date) => Date)) => {
    setMonthState((current) => ({
      value,
      month: typeof next === "function" ? next(current.month) : next,
    }));
  };
  const [defaultTime, setDefaultTime] = useState(() => ({
    hour: new Date().getHours(),
    minute: 0,
  }));
  const selectedDate = parsed;
  const hour = parsed?.getHours() ?? defaultTime.hour;
  const minute = parsed?.getMinutes() ?? defaultTime.minute;
  const [popoverPosition, setPopoverPosition] = useState({ top: 12, left: 12 });
  const containerRef = useRef<HTMLDivElement>(null);

  const positionPopover = useCallback(() => {
    const anchor = containerRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const width = Math.min(560, window.innerWidth - 24);
    const height = Math.min(460, window.innerHeight * 0.78);
    const left = Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12));
    const roomBelow = window.innerHeight - anchor.bottom;
    const top =
      roomBelow >= height + 12
        ? anchor.bottom + 8
        : anchor.top >= height + 12
          ? anchor.top - height - 8
          : Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - height - 12));
    setPopoverPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => positionPopover();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, positionPopover]);

  const days = useMemo(() => {
    const first = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const leading = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - leading);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [displayedMonth]);

  const minDate = useMemo(() => parseIso(min), [min]);
  const maxDate = useMemo(() => parseIso(max), [max]);

  const isUnavailable = (day: Date) => {
    if (minDate && day < minDate && !sameDate(day, minDate)) return true;
    if (maxDate && day > maxDate && !sameDate(day, maxDate)) return true;
    return false;
  };

  const commit = (date: Date, h: number, m: number) => {
    const next = buildIso(date, h, m);
    if (controlledValue === undefined) setInternalValue(next);
    onChange?.(next);
  };

  const chooseDay = (day: Date) => {
    if (isUnavailable(day)) return;
    setDisplayedMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    commit(day, hour, minute);
  };

  const changeHour = (h: number) => {
    setDefaultTime({ hour: h, minute });
    if (selectedDate) commit(selectedDate, h, minute);
  };

  const changeMinute = (m: number) => {
    setDefaultTime({ hour, minute: m });
    if (selectedDate) commit(selectedDate, hour, m);
  };

  const clear = () => {
    setDefaultTime({ hour, minute });
    if (controlledValue === undefined) setInternalValue("");
    onChange?.("");
    setIsOpen(false);
  };

  const goToday = () => {
    const now = new Date();
    setDisplayedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setDefaultTime({ hour: now.getHours(), minute: now.getMinutes() });
    commit(now, now.getHours(), now.getMinutes());
  };

  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" })
    .format(displayedMonth)
    .replace(/^./, (l) => l.toUpperCase());

  const todayDate = new Date();

  return (
    <div ref={containerRef} className={`${styles.wrapper} ${className ?? ""}`}>
      <button
        id={pickerId}
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""} ${error ? styles.triggerError : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={() => {
          if (isOpen) setIsOpen(false);
          else {
            const current = parsed ?? new Date();
            setDisplayedMonth(new Date(current.getFullYear(), current.getMonth(), 1));
            positionPopover();
            setIsOpen(true);
          }
        }}
      >
        <span className={parsed ? styles.value : styles.placeholder}>
          {parsed ? formatDisplay(parsed) : placeholder}
        </span>
        <CalendarDays size={18} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className={`${styles.popover} ${timeStyles.popover}`}
          style={{
            position: "fixed",
            top: popoverPosition.top,
            left: popoverPosition.left,
            right: "auto",
          }}
          role="dialog"
          aria-label="Chọn ngày giờ"
        >
          <div className={timeStyles.layout}>
            {/* ---- Calendar ---- */}
            <div>
              <div className={styles.header}>
                <button
                  type="button"
                  className={styles.navButton}
                  onClick={() =>
                    setDisplayedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
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
                    setDisplayedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                  }
                  aria-label="Tháng sau"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className={styles.weekdays}>
                {weekdayLabels.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className={styles.days}>
                {days.map((day) => {
                  const iso = toIsoDate(day);
                  const outside = day.getMonth() !== displayedMonth.getMonth();
                  const unavailable = isUnavailable(day);
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={unavailable}
                      onClick={() => chooseDay(day)}
                      className={`${styles.day} ${outside ? styles.outside : ""} ${selectedDate && sameDate(day, selectedDate) ? styles.selected : ""} ${sameDate(day, todayDate) ? styles.today : ""}`}
                      aria-label={new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(
                        day,
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---- Time columns ---- */}
            <div className={timeStyles.timePicker}>
              <strong className={timeStyles.timeTitle}>Giờ và phút</strong>
              <div className={timeStyles.timeControls}>
                <label className={timeStyles.timeField}>
                  <span>Giờ</span>
                  <div className={timeStyles.timeInputWrap}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={23}
                      step={1}
                      value={pad(hour)}
                      aria-label="Giờ"
                      onChange={(event) => {
                        const next = event.currentTarget.value;
                        if (!next) return;
                        const parsedHour = Number(next);
                        if (Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23)
                          changeHour(parsedHour);
                      }}
                    />
                    <span className={timeStyles.timeSteppers}>
                      <button
                        type="button"
                        aria-label="Tăng giờ"
                        onClick={() => changeHour((hour + 1) % 24)}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Giảm giờ"
                        onClick={() => changeHour((hour + 23) % 24)}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </span>
                  </div>
                </label>
                <label className={timeStyles.timeField}>
                  <span>Phút</span>
                  <div className={timeStyles.timeInputWrap}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={59}
                      step={1}
                      value={pad(minute)}
                      aria-label="Phút"
                      onChange={(event) => {
                        const next = event.currentTarget.value;
                        if (!next) return;
                        const parsedMinute = Number(next);
                        if (
                          Number.isInteger(parsedMinute) &&
                          parsedMinute >= 0 &&
                          parsedMinute <= 59
                        )
                          changeMinute(parsedMinute);
                      }}
                    />
                    <span className={timeStyles.timeSteppers}>
                      <button
                        type="button"
                        aria-label="Tăng phút"
                        onClick={() => changeMinute((minute + 1) % 60)}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Giảm phút"
                        onClick={() => changeMinute((minute + 59) % 60)}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </span>
                  </div>
                </label>
              </div>
              <span className={timeStyles.timeHint}>Dùng định dạng 24 giờ</span>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={clear} disabled={!value}>
              <X size={15} /> Xóa
            </button>
            <button type="button" onClick={goToday}>
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
