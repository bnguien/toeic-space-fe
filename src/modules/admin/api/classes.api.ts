import { httpClient } from "@/services/http";
import type {
  ClassDetail,
  DeletedClassPage,
  ClassFilters,
  ClassPage,
  ClassStatus,
  CreateClassPayload,
  TeacherPage,
  UpdateClassPayload,
} from "../types/class.types";

const classroomBase = "/classroom/api/v1/classes";

export const classesApi = {
  list: async (filters: ClassFilters, signal: AbortSignal) =>
    (await httpClient.get<ClassPage>(classroomBase, { params: filters, signal })).data,
  deleted: async (search: string, page: number, signal: AbortSignal) =>
    (
      await httpClient.get<DeletedClassPage>(`${classroomBase}/deleted`, {
        params: { search: search || undefined, page, pageSize: 20 },
        signal,
      })
    ).data,
  mine: async (page: number, signal: AbortSignal) =>
    (
      await httpClient.get<ClassPage>(`${classroomBase}/me`, {
        params: { page, pageSize: 20 },
        signal,
      })
    ).data,
  detail: async (id: string, signal: AbortSignal) =>
    (await httpClient.get<ClassDetail>(`${classroomBase}/${id}`, { signal })).data,
  create: async (payload: CreateClassPayload) =>
    (await httpClient.post<ClassDetail>(classroomBase, payload)).data,
  update: async (id: string, payload: UpdateClassPayload) =>
    (await httpClient.patch<ClassDetail>(`${classroomBase}/${id}`, payload)).data,
  changeStatus: async (id: string, status: ClassStatus) =>
    (await httpClient.patch<ClassDetail>(`${classroomBase}/${id}/status`, { status })).data,
  archive: async (id: string) =>
    (await httpClient.post<ClassDetail>(`${classroomBase}/${id}/archive`)).data,
  restore: async (id: string) =>
    (await httpClient.post<ClassDetail>(`${classroomBase}/${id}/restore`)).data,
  remove: async (id: string) => {
    await httpClient.delete(`${classroomBase}/${id}`);
  },
  adminRestore: async (id: string) =>
    (await httpClient.post<ClassDetail>(`${classroomBase}/${id}/admin-restore`)).data,
  removePermanent: async (id: string) => {
    await httpClient.delete(`${classroomBase}/${id}/permanent`);
  },
  assignTeacher: async (id: string, teacherId: string) =>
    (await httpClient.put<ClassDetail>(`${classroomBase}/${id}/teacher`, { teacherId })).data,
  unassignTeacher: async (id: string) =>
    (await httpClient.delete<ClassDetail>(`${classroomBase}/${id}/teacher`)).data,
  teachers: async (search: string, signal: AbortSignal, page = 1) =>
    (
      await httpClient.get<TeacherPage>("/identity/api/v1/users/teachers", {
        params: { search: search || undefined, page, pageSize: 100 },
        signal,
      })
    ).data,
};
