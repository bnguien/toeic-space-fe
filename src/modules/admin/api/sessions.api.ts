import { httpClient } from "@/services/http";
import type { StudentConflictPreview } from "@/shared/types/student-conflicts.types";
import type { PageResult } from "../types/facility.types";
import type {
  MeetLinkView,
  MeetStatusView,
  SessionAuditView,
  SessionEdit,
  SessionFilters,
  SessionInput,
  SessionView,
} from "../types/schedule.types";

const base = "/classroom/api/v1/class-sessions";

export const sessionsApi = {
  list: async (filters: SessionFilters, signal?: AbortSignal) =>
    (
      await httpClient.get<PageResult<SessionView>>(base, {
        params: {
          classId: filters.classId || undefined,
          teacherId: filters.teacherId || undefined,
          status: filters.status || undefined,
          from: filters.from,
          to: filters.to,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 20,
        },
        signal,
      })
    ).data,

  get: async (id: string, signal?: AbortSignal) =>
    (await httpClient.get<SessionView>(`${base}/${id}`, { signal })).data,

  create: async (input: SessionInput) => (await httpClient.post<SessionView>(base, input)).data,

  previewCreate: async (input: SessionInput) =>
    (await httpClient.post<StudentConflictPreview>(`${base}/conflicts/preview`, input)).data,

  update: async (id: string, input: SessionEdit) =>
    (await httpClient.put<SessionView>(`${base}/${id}`, input)).data,

  previewUpdate: async (id: string, input: SessionEdit) =>
    (await httpClient.post<StudentConflictPreview>(`${base}/${id}/conflicts/preview`, input)).data,

  cancel: async (id: string, reason: string) =>
    (await httpClient.post<SessionView>(`${base}/${id}/cancel`, { reason })).data,

  complete: async (id: string) =>
    (await httpClient.post<SessionView>(`${base}/${id}/complete`, {})).data,

  audit: async (id: string, signal?: AbortSignal) =>
    (await httpClient.get<SessionAuditView[]>(`${base}/${id}/audit`, { signal })).data,

  meetStatus: async (id: string, signal?: AbortSignal) =>
    (await httpClient.get<MeetStatusView>(`${base}/${id}/meet/status`, { signal })).data,

  meetLink: async (id: string, signal?: AbortSignal) =>
    (await httpClient.get<MeetLinkView>(`${base}/${id}/meet/link`, { signal })).data,

  retryMeet: async (id: string) => {
    await httpClient.post(`${base}/${id}/meet/retry`);
  },
};
