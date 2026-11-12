import { httpClient } from "@/services/http";

const base = "/payment/api/v1/admin/coupons";
export type DiscountType = "Percentage" | "FixedAmount";
export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  startAt: string;
  expiresAt: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  isActive: boolean;
  applicableCourseIds: string[];
  usedCount: number;
  reservedCount: number;
  remainingUses: number | null;
}
export interface CouponPage {
  page: number;
  pageSize: number;
  totalCount: number;
  items: Coupon[];
}
export type CouponPayload = Omit<Coupon, "id" | "usedCount" | "reservedCount" | "remainingUses">;
export const couponPayload = (coupon: Coupon, isActive = coupon.isActive): CouponPayload => ({
  code: coupon.code,
  description: coupon.description,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  minimumOrderAmount: coupon.minimumOrderAmount,
  maximumDiscountAmount: coupon.maximumDiscountAmount,
  startAt: coupon.startAt,
  expiresAt: coupon.expiresAt,
  usageLimit: coupon.usageLimit,
  perUserLimit: coupon.perUserLimit,
  isActive,
  applicableCourseIds: coupon.applicableCourseIds,
});
export const couponsApi = {
  list: async (
    params: { search?: string; isActive?: boolean; page: number; pageSize: number },
    signal?: AbortSignal,
  ) => (await httpClient.get<CouponPage>(base, { params, signal })).data,
  create: async (payload: CouponPayload) => (await httpClient.post(base, payload)).data,
  update: async (id: string, payload: CouponPayload) =>
    (await httpClient.put(`${base}/${id}`, payload)).data,
  deactivate: async (id: string) => (await httpClient.post(`${base}/${id}/deactivate`)).data,
  delete: async (id: string) => {
    await httpClient.delete(`${base}/${id}`);
  },
};
