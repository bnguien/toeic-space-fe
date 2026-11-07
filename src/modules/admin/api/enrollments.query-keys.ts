import type { EnrollmentFilters } from "../types/enrollment.types";

export const enrollmentKeys = {
  lists: (classId: string) => ["class-enrollments", classId] as const,
  list: (classId: string, filters: EnrollmentFilters) =>
    [...enrollmentKeys.lists(classId), filters] as const,
  students: (search: string, page: number) => ["eligible-students", search, page] as const,
};
