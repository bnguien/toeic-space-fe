import { useState, type FormEvent } from "react";

import { Select, type SelectOption } from "@/shared/components/Select";
import { DateTimePicker } from "@/shared/components/DatePicker";
import { Button } from "./ui";
import { CouponCourses } from "./CouponCourses";
import type { Coupon, CouponPayload, DiscountType } from "../api/coupons.api";
import { purchaseError } from "../../courses/purchaseError";
import formStyles from "./adminForm.module.css";
import pageStyles from "../../courses/purchase.module.css";

const discountTypeOptions: SelectOption<DiscountType>[] = [
  { value: "Percentage", label: "Phần trăm" },
  { value: "FixedAmount", label: "Số tiền cố định" },
];

const draft = (item?: Coupon, courseId?: string): CouponPayload =>
  item
    ? {
        code: item.code,
        description: item.description,
        discountType: item.discountType,
        discountValue: item.discountValue,
        minimumOrderAmount: item.minimumOrderAmount,
        maximumDiscountAmount: item.maximumDiscountAmount,
        startAt: item.startAt,
        expiresAt: item.expiresAt,
        usageLimit: item.usageLimit,
        perUserLimit: item.perUserLimit,
        isActive: item.isActive,
        applicableCourseIds: [...item.applicableCourseIds],
      }
    : {
        code: "",
        description: null,
        discountType: "Percentage",
        discountValue: 10,
        minimumOrderAmount: 0,
        maximumDiscountAmount: null,
        startAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        usageLimit: null,
        perUserLimit: null,
        isActive: true,
        applicableCourseIds: courseId ? [courseId] : [],
      };

export function CouponForm({
  initial,
  course,
  embedded = false,
  busy,
  save,
  close,
  formId,
}: {
  initial?: Coupon;
  course?: { id: string; title: string };
  embedded?: boolean;
  busy: boolean;
  save: (value: CouponPayload) => Promise<void>;
  close: () => void;
  formId?: string;
}) {
  const [values, setValues] = useState(() => draft(initial, course?.id));
  const [error, setError] = useState("");
  const change = <K extends keyof CouponPayload>(key: K, value: CouponPayload[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const nullableInt = (text: string) => (text === "" ? null : Number(text));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (
      !/^[A-Z0-9_-]{3,32}$/.test(values.code.trim().toUpperCase()) ||
      !Number.isFinite(values.discountValue) ||
      values.discountValue <= 0 ||
      (values.discountType === "Percentage" &&
        (values.discountValue > 100 ||
          Math.abs(values.discountValue * 100 - Math.round(values.discountValue * 100)) >= 1e-9)) ||
      (values.discountType === "FixedAmount" && !Number.isSafeInteger(values.discountValue)) ||
      !Number.isSafeInteger(values.minimumOrderAmount) ||
      values.minimumOrderAmount < 0 ||
      (values.maximumDiscountAmount !== null &&
        (!Number.isSafeInteger(values.maximumDiscountAmount) ||
          values.maximumDiscountAmount < 0)) ||
      [values.usageLimit, values.perUserLimit].some(
        (value) => value !== null && (!Number.isSafeInteger(value) || value <= 0),
      ) ||
      Date.parse(values.startAt) >= Date.parse(values.expiresAt)
    ) {
      setError(
        "Mã, mức giảm, hạn sử dụng hoặc giới hạn không hợp lệ. Các giới hạn để trống nghĩa là không giới hạn.",
      );
      return;
    }
    try {
      await save({ ...values, code: values.code.trim().toUpperCase() });
      close();
    } catch (cause) {
      setError(purchaseError(cause));
    }
  };

  return (
    <form
      id={formId}
      className={embedded ? formStyles.form : `${pageStyles.panel} ${formStyles.form}`}
      onSubmit={(event) => void submit(event)}
    >
      {!embedded && <h2>{initial ? `Sửa mã ${initial.code}` : "Tạo mã giảm giá"}</h2>}

      <section className={formStyles.section}>
        <h3 className={formStyles.sectionTitle}>Thông tin mã giảm giá</h3>
        <div className={formStyles.grid3}>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Mã giảm giá</span>
            <input
              className={formStyles.control}
              required
              minLength={3}
              maxLength={32}
              placeholder="Ví dụ: TOEIC2026"
              value={values.code}
              onChange={(event) => change("code", event.target.value.toUpperCase())}
            />
            <span className={formStyles.hint}>Chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.</span>
          </label>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Mô tả</span>
            <input
              className={formStyles.control}
              maxLength={500}
              placeholder="Ghi chú nội bộ hoặc mô tả ưu đãi"
              value={values.description ?? ""}
              onChange={(event) => change("description", event.target.value || null)}
            />
          </label>
          <div className={formStyles.field}>
            <span className={formStyles.label}>Loại giảm</span>
            <Select
              className={formStyles.selectControl}
              value={values.discountType}
              onChange={(val) => change("discountType", val as DiscountType)}
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
            <span className={formStyles.label}>Đơn tối thiểu (VND)</span>
            <input
              className={formStyles.control}
              type="number"
              min="0"
              step="1"
              value={values.minimumOrderAmount}
              onChange={(event) => change("minimumOrderAmount", Number(event.target.value))}
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
              onChange={(event) => change("maximumDiscountAmount", nullableInt(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className={formStyles.section}>
        <h3 className={formStyles.sectionTitle}>Thời gian & giới hạn</h3>
        <div className={formStyles.grid2}>
          <div className={formStyles.field}>
            <span className={formStyles.label}>Bắt đầu</span>
            <DateTimePicker
              value={values.startAt}
              onChange={(iso) => {
                if (iso) change("startAt", iso);
              }}
            />
          </div>
          <div className={formStyles.field}>
            <span className={formStyles.label}>Hết hạn</span>
            <DateTimePicker
              value={values.expiresAt}
              onChange={(iso) => {
                if (iso) change("expiresAt", iso);
              }}
            />
          </div>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Giới hạn toàn hệ thống</span>
            <input
              className={formStyles.control}
              type="number"
              min="1"
              step="1"
              placeholder="Không giới hạn"
              value={values.usageLimit ?? ""}
              onChange={(event) => change("usageLimit", nullableInt(event.target.value))}
            />
          </label>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Giới hạn mỗi học viên</span>
            <input
              className={formStyles.control}
              type="number"
              min="1"
              step="1"
              placeholder="Không giới hạn"
              value={values.perUserLimit ?? ""}
              onChange={(event) => change("perUserLimit", nullableInt(event.target.value))}
            />
          </label>
        </div>
        <label className={formStyles.checkRow}>
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => change("isActive", event.target.checked)}
          />
          Đang hoạt động
        </label>
      </section>

      <section className={formStyles.section}>
        <h3 className={formStyles.sectionTitle}>Phạm vi áp dụng</h3>
        {course && !initial ? (
          <p className={formStyles.scope}>
            Khóa học: <strong>{course.title}</strong>
          </p>
        ) : (
          <CouponCourses
            ids={values.applicableCourseIds}
            onChange={(ids) => change("applicableCourseIds", ids)}
          />
        )}
      </section>

      {error && (
        <p className={formStyles.error} role="alert">
          {error}
        </p>
      )}
      {!formId && (
        <div className={pageStyles.row}>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu mã giảm giá"}
          </Button>
          <Button onClick={close} disabled={busy}>
            Hủy
          </Button>
        </div>
      )}
    </form>
  );
}
