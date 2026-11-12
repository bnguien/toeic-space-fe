import { httpClient } from "@/services/http";
import type {
  BulkEnrollmentResult,
  ClassEnrollment,
  EnrollmentFilters,
  ImportEnrollmentsResult,
  Page,
  StudentOption,
} from "../types/enrollment.types";

const base = "/classroom/api/v1/classes";

export const enrollmentsApi = {
  list: async (classId: string, filters: EnrollmentFilters, signal?: AbortSignal) =>
    (
      await httpClient.get<Page<ClassEnrollment>>(`${base}/${classId}/enrollments`, {
        params: filters,
        signal,
      })
    ).data,
  students: async (search: string, page: number, signal?: AbortSignal) =>
    (
      await httpClient.get<Page<StudentOption>>("/identity/api/v1/users/students", {
        params: { search: search || undefined, page, pageSize: 20 },
        signal,
      })
    ).data,
  bulkEnroll: async (classId: string, studentIds: string[]) =>
    (
      await httpClient.post<BulkEnrollmentResult>(`${base}/${classId}/enrollments/bulk`, {
        studentIds,
      })
    ).data,
  withdraw: async (classId: string, enrollmentId: string) =>
    (
      await httpClient.post<ClassEnrollment>(
        `${base}/${classId}/enrollments/${enrollmentId}/withdraw`,
      )
    ).data,
  importStudents: async (classId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (
      await httpClient.post<ImportEnrollmentsResult>(
        `${base}/${classId}/enrollments/import`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      )
    ).data;
  },
};
