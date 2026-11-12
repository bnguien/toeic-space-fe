import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { studentClassesApi } from "../api/student-classes.api";
import type { StudentClassFilters } from "../types/student-class.types";

const keys = {
  list: (filters: StudentClassFilters) => ["student", "classes", filters] as const,
  detail: (id: string) => ["student", "classes", "detail", id] as const,
};

export const useStudentClasses = (filters: StudentClassFilters) =>
  useQuery({
    queryKey: keys.list(filters),
    queryFn: ({ signal }) => studentClassesApi.list(filters, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });

export const useStudentClassDetail = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ""),
    queryFn: ({ signal }) => studentClassesApi.detail(id!, signal),
    enabled: Boolean(id),
    retry: false,
  });
