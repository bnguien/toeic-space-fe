import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/modules/auth";
import { enrollmentsApi } from "../api/enrollments.api";
import { enrollmentKeys } from "../api/enrollments.query-keys";
import type { EnrollmentFilters } from "../types/enrollment.types";
import { isEnrollmentConflict } from "../utils/enrollmentError";

export function useClassEnrollments(classId: string, filters: EnrollmentFilters) {
  const isAdmin = useCurrentUser()?.role === "Admin";
  return useQuery({
    queryKey: enrollmentKeys.list(classId, filters),
    queryFn: ({ signal }) => enrollmentsApi.list(classId, filters, signal),
    enabled: isAdmin && Boolean(classId),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useEligibleStudents(search: string, page: number, enabled: boolean) {
  const isAdmin = useCurrentUser()?.role === "Admin";
  return useQuery({
    queryKey: enrollmentKeys.students(search, page),
    queryFn: ({ signal }) => enrollmentsApi.students(search, page, signal),
    enabled: enabled && isAdmin,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useEnrollmentActions(classId: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: enrollmentKeys.lists(classId) });
  const onError = (error: unknown) => {
    if (isEnrollmentConflict(error)) void refresh();
  };
  return {
    bulkEnroll: useMutation({
      mutationFn: (studentIds: string[]) => enrollmentsApi.bulkEnroll(classId, studentIds),
      onSuccess: refresh,
      onError,
    }),
    importStudents: useMutation({
      mutationFn: (file: File) => enrollmentsApi.importStudents(classId, file),
      onSuccess: refresh,
      onError,
    }),
    withdraw: useMutation({
      mutationFn: (enrollmentId: string) => enrollmentsApi.withdraw(classId, enrollmentId),
      onSuccess: refresh,
      onError,
    }),
  };
}
