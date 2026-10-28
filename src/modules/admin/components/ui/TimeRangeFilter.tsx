import { TIME_RANGES, type TimeRange } from "./timeRange";
import styles from "./charts.module.css";

/** The one range picker of the admin area: 24 giờ · 3 ngày · 7 ngày · 30 ngày · 90 ngày. */
export function TimeRangeFilter({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className={styles.ranges} role="radiogroup" aria-label="Khoảng thời gian">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          role="radio"
          aria-checked={range.value === value}
          onClick={() => onChange(range.value)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
