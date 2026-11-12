import { useState, type FormEvent } from "react";
import type { CourseItem } from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import { Button } from "./ui";
import styles from "../pages/CoursesPage.module.css";

export function CoursePricingForm({
  course,
  pending,
  onSave,
  onCancel,
  embedded = false,
}: {
  course: CourseItem;
  pending: boolean;
  onSave: (price: number, capacity: number | null) => Promise<void>;
  onCancel?: () => void;
  embedded?: boolean;
}) {
  const [price, setPrice] = useState(String(course.price));
  const [capacity, setCapacity] = useState(course.capacity === null ? "" : String(course.capacity));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    const amount = Number(price);
    const seats = capacity.trim() ? Number(capacity) : null;
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      !Number.isSafeInteger(seats ?? 1) ||
      (seats !== null && seats <= 0)
    ) {
      setError("Giá phải là số nguyên VND không âm; sức chứa để trống hoặc nhập số nguyên dương.");
      return;
    }
    try {
      await onSave(amount, seats);
      setSaved(true);
    } catch (cause) {
      setError(courseErrorMessage(cause));
    }
  };
  return (
    <form
      className={embedded ? styles.pricingFormEmbedded : styles.pricingForm}
      onSubmit={(event) => void submit(event)}
    >
      {!embedded && <h3>Học phí và sức chứa</h3>}
      <label>
        Giá (VND){" "}
        <input
          type="number"
          min="0"
          step="1"
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <label>
        Sức chứa (để trống = không giới hạn){" "}
        <input
          type="number"
          min="1"
          step="1"
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
        />
      </label>
      <div className={styles.pricingActions}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu học phí"}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} disabled={pending}>
            Hủy
          </Button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {saved && !embedded && <p role="status">Đã cập nhật học phí và sức chứa.</p>}
    </form>
  );
}
