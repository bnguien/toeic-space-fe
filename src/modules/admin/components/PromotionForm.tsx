import { useState, type FormEvent } from "react";

import type { Promotion } from "../api/promotions.api";
import type { CourseItem } from "../types/course.types";
import { money, vnd } from "../../courses/purchaseApi";
import { purchaseError } from "../../courses/purchaseError";
import { localDateTimeInput, promotionDiscount, promotionSellingPrice } from "../utils/promotion";
import { Select, type SelectOption } from "@/shared/components/Select";
import { DateTimePicker } from "@/shared/components/DatePicker";
import formStyles from "./adminForm.module.css";

const discountTypeOptions: SelectOption<Promotion["discountType"]>[] = [
  { value: "Percentage", label: "Phần trăm" },
  { value: "FixedAmount", label: "Số tiền cố định" },
];

const draft = (initial: Promotion | undefined, courseId: string): Promotion => {
  if (initial) {
    return {
      ...initial,
      startAt: localDateTimeInput(initial.startAt),
      expiresAt: localDateTimeInput(initial.expiresAt),
      courseIds: [...initial.courseIds],
    };
  }
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return {
    id: "",
    name: "",
    discountType: "Percentage",
    discountValue: 10,
    maximumDiscountAmount: null,
    startAt: localDateTimeInput(start),
    expiresAt: localDateTimeInput(end),
    isActive: true,
    usageLimit: null,
    courseIds: [courseId],
  };
};

export function PromotionForm({
  formId,
  course,
  initial,
  pending,
  onSave,
}: {
  formId: string;
  course: CourseItem;
  initial?: Promotion;
  pending: boolean;
  onSave: (value: Promotion) => Promise<void>;
}) {
  const [values, setValues] = useState(() => draft(initial, course.id));
  const [error, setError] = useState("");
  const change = <K extends keyof Promotion>(key: K, value: Promotion[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const discount = promotionDiscount(values, course.price);
  const sellingPrice = promotionSellingPrice(values, course.price);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const percentage = values.discountType === "Percentage";
    const valid =
      Boolean(values.name.trim()) &&
      values.name.trim().length <= 160 &&
      values.courseIds.length > 0 &&
      Number.isFinite(values.discountValue) &&
      values.discountValue > 0 &&
      (percentage
        ? values.discountValue <= 100 &&
          Math.abs(values.discountValue * 100 - Math.round(values.discountValue * 100)) < 1e-9
        : Number.isSafeInteger(values.discountValue)) &&
      (values.maximumDiscountAmount === null ||
        (Number.isSafeInteger(values.maximumDiscountAmount) && values.maximumDiscountAmount > 0)) &&
      (values.usageLimit === null ||
        (Number.isSafeInteger(values.usageLimit) && values.usageLimit > 0)) &&
      Boolean(values.startAt) &&
      Boolean(values.expiresAt) &&
      Date.parse(values.startAt) < Date.parse(values.expiresAt);
    if (!valid) {
      setError(
        "Thông tin khuyến mãi chưa hợp lệ. Kiểm tra tên, mức giảm, thời gian và giới hạn lượt dùng.",
      );
      return;
    }
    try {
      await onSave({
        ...values,
        name: values.name.trim(),
        discountValue: Number(values.discountValue),
        startAt: new Date(values.startAt).toISOString(),
        expiresAt: new Date(values.expiresAt).toISOString(),
        courseIds: initial ? values.courseIds : [course.id],
      });
    } catch (cause) {
      setError(purchaseError(cause));
    }
  };

  return (
    <form id={formId} className={formStyles.form} onSubmit={(event) => void submit(event)}>
      <div className={formStyles.preview}>
        <span>Giá sau khuyến mãi (tạm tính)</span>
        <strong>{money(sellingPrice)}</strong>
        <div className={formStyles.previewRow}>
          <span>Giá gốc {money(course.price)}</span>
          <span>Giảm {vnd(discount)}</span>
        </div>
      </div>

      <section className={formStyles.section}>
        <h3 className={formStyles.sectionTitle}>Thông tin khuyến mãi</h3>
        <div className={formStyles.grid3}>
          <label className={`${formStyles.field} ${formStyles.fullWidth}`}>
            <span className={formStyles.label}>Tên khuyến mãi</span>
            <input
              className={formStyles.control}
              required
              maxLength={160}
              placeholder="Ví dụ: Ưu đãi khai giảng"
              value={values.name}
              onChange={(event) => change("name", event.target.value)}
            />
          </label>
          <div className={formStyles.field}>
            <span className={formStyles.label}>Loại giảm</span>
            <Select
              className={formStyles.selectControl}
              value={values.discountType}
              onChange={(val) => change("discountType", val as Promotion["discountType"])}
              options={discountTypeOptions}
            />
          </div>
          <label className={formStyles.field}>
            <span className={formStyles.label}>
              {values.discountType === "Percentage" ? "Mức giảm (%)" : "Số tiền giảm (VND)"}
            </span>
            <input
              className={formStyles.control}
              type="number"
              required
              min={values.discountType === "Percentage" ? "0.01" : "1"}
              max={values.discountType === "Percentage" ? 100 : undefined}
              step={values.discountType === "Percentage" ? "0.01" : "1"}
              value={values.discountValue}
              onChange={(event) => change("discountValue", Number(event.target.value))}
            />
          </label>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Giảm tối đa (VND)</span>
            <input
              className={formStyles.control}
              type="number"
              min="1"
              step="1"
              placeholder="Không giới hạn"
              value={values.maximumDiscountAmount ?? ""}
              onChange={(event) =>
                change(
                  "maximumDiscountAmount",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
            <span className={formStyles.hint}>Để trống nếu không giới hạn mức giảm.</span>
          </label>
        </div>
      </section>

      <section className={formStyles.section}>
        <h3 className={formStyles.sectionTitle}>Thời gian & giới hạn</h3>
        <div className={formStyles.grid3}>
          <div className={formStyles.field}>
            <span className={formStyles.label}>Bắt đầu</span>
            <DateTimePicker
              value={values.startAt ? new Date(values.startAt).toISOString() : ""}
              onChange={(iso) => {
                if (iso) change("startAt", localDateTimeInput(iso));
              }}
            />
          </div>
          <div className={formStyles.field}>
            <span className={formStyles.label}>Kết thúc</span>
            <DateTimePicker
              value={values.expiresAt ? new Date(values.expiresAt).toISOString() : ""}
              onChange={(iso) => {
                if (iso) change("expiresAt", localDateTimeInput(iso));
              }}
            />
          </div>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Giới hạn lượt dùng</span>
            <input
              className={formStyles.control}
              type="number"
              min="1"
              step="1"
              placeholder="Không giới hạn"
              value={values.usageLimit ?? ""}
              onChange={(event) =>
                change("usageLimit", event.target.value ? Number(event.target.value) : null)
              }
            />
          </label>
        </div>
      </section>

      <section className={formStyles.section}>
        <h3 className={formStyles.sectionTitle}>Phạm vi áp dụng</h3>
        {initial && initial.courseIds.length > 1 ? (
          <p className={formStyles.scope}>
            Áp dụng cho <strong>{initial.courseIds.length} khóa học</strong>, bao gồm khóa học này.
            Phạm vi được giữ nguyên khi chỉnh sửa tại đây.
          </p>
        ) : (
          <p className={formStyles.scope}>
            Khóa học: <strong>{course.title}</strong>
          </p>
        )}
        <label className={formStyles.checkRow}>
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => change("isActive", event.target.checked)}
          />
          Kích hoạt khuyến mãi ngay
        </label>
      </section>

      {error && (
        <p className={formStyles.error} role="alert">
          {error}
        </p>
      )}
      {pending && <p className={formStyles.hint}>Đang lưu khuyến mãi…</p>}
    </form>
  );
}
