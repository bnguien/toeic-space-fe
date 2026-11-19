import { useQuery } from "@tanstack/react-query";

import { promotionsApi } from "../api/promotions.api";
import { promotionStatus } from "../utils/promotion";

const order = { running: 0, scheduled: 1, inactive: 2, expired: 3 } as const;

export const useCoursePromotions = (courseId: string) =>
  useQuery({
    queryKey: ["course-promotions", courseId],
    queryFn: async ({ signal }) => {
      const result = await promotionsApi.list(signal);
      const now = Date.now();
      return result
        .filter(({ promotion }) => promotion.courseIds.includes(courseId))
        .sort(
          (a, b) =>
            order[promotionStatus(a.promotion, now)] - order[promotionStatus(b.promotion, now)] ||
            Date.parse(a.promotion.startAt) - Date.parse(b.promotion.startAt),
        );
    },
    retry: false,
  });
