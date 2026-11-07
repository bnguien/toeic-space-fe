import type { CourseFilters } from "../types/course.types";

export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (filters: CourseFilters) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  modules: (courseId: string) => [...courseKeys.all, "modules", courseId] as const,
  counts: () => [...courseKeys.all, "counts"] as const,
};
