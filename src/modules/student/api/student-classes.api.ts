import { httpClient } from "@/services/http";
import type {
  StudentClassDetail,
  StudentClassFilters,
  StudentClassPage,
} from "../types/student-class.types";

const base = "/classroom/api/v1/classes/me/enrolled";

export const studentClassesApi = {
  list: async (filters: StudentClassFilters, signal: AbortSignal) =>
    (await httpClient.get<StudentClassPage>(base, { params: filters, signal })).data,
  detail: async (id: string, signal: AbortSignal) =>
    (await httpClient.get<StudentClassDetail>(`${base}/${id}`, { signal })).data,
};
