import type { Promotion } from "../api/promotions.api";

export type PromotionStatus = "running" | "scheduled" | "expired" | "inactive";

export const promotionStatus = (
  promotion: Pick<Promotion, "isActive" | "startAt" | "expiresAt">,
  now: number,
): PromotionStatus => {
  if (!promotion.isActive) return "inactive";
  if (Date.parse(promotion.startAt) > now) return "scheduled";
  if (Date.parse(promotion.expiresAt) <= now) return "expired";
  return "running";
};

export const promotionStatusLabel = (status: PromotionStatus) =>
  status === "running"
    ? "Đang chạy"
    : status === "scheduled"
      ? "Sắp diễn ra"
      : status === "expired"
        ? "Đã kết thúc"
        : "Đã tắt";

export const isPromotionRunning = (
  promotion: Pick<Promotion, "isActive" | "startAt" | "expiresAt">,
  now: number,
) => promotionStatus(promotion, now) === "running";

export const promotionDiscount = (
  promotion: Pick<Promotion, "discountType" | "discountValue" | "maximumDiscountAmount">,
  price: number,
) => {
  if (!Number.isFinite(price) || !Number.isFinite(promotion.discountValue)) return 0;
  const raw =
    promotion.discountType === "Percentage"
      ? Math.round((price * promotion.discountValue) / 100)
      : promotion.discountValue;
  const capped =
    promotion.maximumDiscountAmount === null || !Number.isFinite(promotion.maximumDiscountAmount)
      ? raw
      : Math.min(raw, promotion.maximumDiscountAmount);
  return Math.min(price, Math.max(0, capped));
};

export const promotionSellingPrice = (
  promotion: Pick<Promotion, "discountType" | "discountValue" | "maximumDiscountAmount">,
  price: number,
) => Math.max(0, price - promotionDiscount(promotion, price));

export const localDateTimeInput = (value: string | Date) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const formatDate = (value: string) => new Date(value).toLocaleString("vi-VN");
