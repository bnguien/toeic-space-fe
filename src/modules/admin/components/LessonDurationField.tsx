import styles from "./lessonManagement.module.css";

export function LessonDurationField({
  hours,
  minutes,
  seconds,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
}: {
  hours: string;
  minutes: string;
  seconds: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onSecondsChange: (value: string) => void;
}) {
  const total = [hours, minutes, seconds]
    .map((value) => String(Number(value || 0)).padStart(2, "0"))
    .join(":");
  return (
    <fieldset className={styles.durationField}>
      <legend>
        Thời lượng bài học <span>(Không bắt buộc)</span>
      </legend>
      <div className={styles.durationInputs}>
        <label>
          Giờ
          <input
            type="number"
            min={0}
            step={1}
            value={hours}
            onChange={(event) => onHoursChange(event.target.value)}
          />
        </label>
        <label>
          Phút
          <input
            type="number"
            min={0}
            max={59}
            step={1}
            value={minutes}
            onChange={(event) => onMinutesChange(event.target.value)}
          />
        </label>
        <label>
          Giây
          <input
            type="number"
            min={0}
            max={59}
            step={1}
            value={seconds}
            onChange={(event) => onSecondsChange(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.durationTotal}>
        <span>Tổng thời lượng</span>
        <strong>{total}</strong>
      </div>
    </fieldset>
  );
}
