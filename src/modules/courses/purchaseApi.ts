import { httpClient } from "@/services/http";
import { enrollmentResponse } from "./checkoutState";

const enrollments = "/content/api/v1/enrollments";
const orders = "/payment/api/v1/orders";

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: "Active";
  enrolledAt: string;
}
export interface MyCourse {
  courseId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  enrollmentStatus: "Active";
  enrolledAt: string;
}
export interface MyCoursePage {
  items: MyCourse[];
  page: number;
  pageSize: number;
  totalCount: number;
}
export interface PricePreview {
  courseId: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  discountSource: "None" | "Coupon" | "Promotion";
  promotionId: string | null;
  promotionName: string | null;
  promotionExpiresAt: string | null;
}
export type OrderStatus = "Pending" | "Paid" | "Expired" | "Cancelled";
export type FulfillmentStatus = "NotStarted" | "Pending" | "Completed" | "NeedsReview";
export interface OrderResult extends Omit<PricePreview, "courseId"> {
  id: string;
  orderCode: string;
  courseId: string;
  status: OrderStatus;
  fulfillment: FulfillmentStatus;
  couponCode: string | null;
  expiresAt: string;
  paymentReference: string | null;
  bank: string | null;
  accountNumber: string | null;
  qrUrl: string | null;
}
export const purchaseApi = {
  enrollment: async (courseId: string, signal?: AbortSignal) => {
    const response = await httpClient.get<Enrollment | null>(`${enrollments}/${courseId}`, {
      signal,
    });
    // ASP.NET serializes a null status DTO as 204 No Content.
    return enrollmentResponse(response.status, response.data);
  },
  enroll: async (courseId: string) =>
    (await httpClient.post<Enrollment>(`${enrollments}/${courseId}`)).data,
  mine: async (page: number, search: string, signal?: AbortSignal, pageSize = 12) =>
    (
      await httpClient.get<MyCoursePage>(`${enrollments}/me`, {
        params: { page, pageSize, search: search || undefined },
        signal,
      })
    ).data,
  lesson: async (courseId: string, lessonId: string, signal?: AbortSignal) =>
    (
      await httpClient.get<import("./courseCatalog").PublicPreview>(
        `${enrollments}/${courseId}/lessons/${lessonId}`,
        { signal },
      )
    ).data,
  preview: async (courseId: string, couponCode: string | null, signal?: AbortSignal) =>
    (
      await httpClient.get<PricePreview>(`${orders}/preview`, {
        params: { courseId, couponCode: couponCode || undefined },
        signal,
      })
    ).data,
  checkout: async (courseId: string, checkoutReference: string, couponCode: string | null) =>
    (await httpClient.post<OrderResult>(orders, { courseId, checkoutReference, couponCode })).data,
  order: async (id: string, signal?: AbortSignal) =>
    (await httpClient.get<OrderResult>(`${orders}/${id}`, { signal })).data,
};

export const vnd = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
export const money = (amount: number) => (amount === 0 ? "Miễn phí" : vnd(amount));
