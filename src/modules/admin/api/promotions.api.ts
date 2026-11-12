import { httpClient } from "@/services/http";
import type { DiscountType } from "./coupons.api";

const base = "/content/api/v1/admin/course-promotions";
export interface Promotion {
  id: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maximumDiscountAmount: number | null;
  startAt: string;
  expiresAt: string;
  isActive: boolean;
  usageLimit: number | null;
  courseIds: string[];
}
export interface PromotionView {
  promotion: Promotion;
  usedCount: number;
  reservedCount: number;
}
export const promotionsApi = {
  list: async (signal?: AbortSignal) =>
    (await httpClient.get<PromotionView[]>(base, { signal })).data,
  save: async (value: Promotion) => {
    if (value.id) return (await httpClient.put<PromotionView>(`${base}/${value.id}`, value)).data;
    return (await httpClient.post<PromotionView>(base, { ...value, id: undefined })).data;
  },
  active: async (id: string, value: boolean) =>
    (await httpClient.post<PromotionView>(`${base}/${id}/${value ? "activate" : "deactivate"}`))
      .data,
  delete: async (id: string) => {
    await httpClient.delete(`${base}/${id}`);
  },
  preview: async (courseId: string, value: Promotion) =>
    (
      await httpClient.post<{
        originalPrice: number;
        discountAmount: number;
        sellingPrice: number;
      }>(`${base}/preview/${courseId}`, value)
    ).data,
};
