import { useQuery } from "@tanstack/react-query";
import { teacherClassesApi } from "../api/teacher-classes.api";

export const teacherClassKeys = {
  all: ["teacher", "classes"] as const,
  list: (page: number) => [...teacherClassKeys.all, page] as const,
  detail: (id: string) => [...teacherClassKeys.all, "detail", id] as const,
};

export const useTeacherClasses = (page = 1) =>
  useQuery({
    queryKey: teacherClassKeys.list(page),
    queryFn: ({ signal }) => teacherClassesApi.list(page, signal),
  });

export const useTeacherClassDetail = (id: string | null) =>
  useQuery({
    queryKey: teacherClassKeys.detail(id ?? ""),
    queryFn: ({ signal }) => teacherClassesApi.detail(id!, signal),
    enabled: Boolean(id),
  });
