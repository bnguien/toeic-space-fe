import type { OrderResult, PricePreview } from "./purchaseApi";

export const enrollmentResponse = <T>(status: number, data: T | null | undefined): T | null =>
  status === 204 ? null : (data ?? null);

export const checkoutKey = (userId: string, courseId: string, coupon: string | null) =>
  `checkout:${userId}:${courseId}:${coupon ?? ""}`;

export const quoteChanged = (preview: PricePreview, order: OrderResult) =>
  order.originalAmount !== preview.originalAmount ||
  order.discountAmount !== preview.discountAmount ||
  order.finalAmount !== preview.finalAmount ||
  order.discountSource !== preview.discountSource;

export const shouldPoll = (order: OrderResult | undefined) =>
  Boolean(
    order &&
    (order.status === "Pending" || (order.status === "Paid" && order.fulfillment === "Pending")),
  );

export const remainingSeconds = (expiresAt: string, now: number) =>
  Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
