import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser, useSessionStatus } from "@/modules/auth";
import { purchaseApi } from "./purchaseApi";

export const enrollmentKey = (userId: string, courseId: string) =>
  ["enrollments", userId, courseId] as const;
export const myCoursesKey = (userId: string) => ["my-courses", userId] as const;

export function useOwnedCourseIds() {
  const user = useCurrentUser();
  const status = useSessionStatus();
  return useQuery({
    queryKey: [...myCoursesKey(user?.id ?? ""), "ids"],
    enabled: status === "authenticated" && user?.role === "User",
    queryFn: async ({ signal }) => {
      const first = await purchaseApi.mine(1, "", signal, 100);
      const ids = new Set(first.items.map((item) => item.courseId));
      const pages = Math.ceil(first.totalCount / first.pageSize);
      for (let page = 2; page <= pages; page++) {
        const result = await purchaseApi.mine(page, "", signal, 100);
        result.items.forEach((item) => ids.add(item.courseId));
      }
      return ids;
    },
    retry: false,
  });
}

export function useEnrollment(courseId?: string) {
  const user = useCurrentUser();
  const status = useSessionStatus();
  return useQuery({
    queryKey: enrollmentKey(user?.id ?? "", courseId ?? ""),
    enabled: status === "authenticated" && user?.role === "User" && Boolean(courseId),
    queryFn: ({ signal }) => purchaseApi.enrollment(courseId!, signal),
    retry: false,
  });
}

export function useRefreshEnrollment(courseId: string) {
  const client = useQueryClient();
  const user = useCurrentUser();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: enrollmentKey(user?.id ?? "", courseId) }),
      client.invalidateQueries({ queryKey: myCoursesKey(user?.id ?? "") }),
      client.invalidateQueries({ queryKey: ["public-course", courseId] }),
    ]);
  };
}
