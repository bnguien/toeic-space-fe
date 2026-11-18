import { httpClient } from "@/services/http";
import type { StudentConflictPreview } from "@/shared/types/student-conflicts.types";
import type {
  CancelRangeRequest,
  ClassSchedule,
  GenerateSessionsInput,
  ScheduleAuditView,
  ScheduleInput,
  SessionOperationResult,
} from "../types/schedule.types";

const base = (classId: string) => `/classroom/api/v1/classes/${classId}/schedules`;

export const schedulesApi = {
  list: async (classId: string, signal?: AbortSignal) =>
    (await httpClient.get<ClassSchedule[]>(base(classId), { signal })).data,

  get: async (classId: string, id: string, signal?: AbortSignal) =>
    (await httpClient.get<ClassSchedule>(`${base(classId)}/${id}`, { signal })).data,

  create: async (classId: string, input: ScheduleInput) =>
    (await httpClient.post<ClassSchedule>(base(classId), input)).data,

  previewCreate: async (classId: string, input: ScheduleInput) =>
    (await httpClient.post<StudentConflictPreview>(`${base(classId)}/conflicts/preview`, input))
      .data,

  update: async (classId: string, id: string, input: ScheduleInput, expectedVersion: number) =>
    (
      await httpClient.put<{
        schedule: ClassSchedule;
        sessions: SessionOperationResult;
      }>(`${base(classId)}/${id}`, { input, expectedVersion })
    ).data,

  previewUpdate: async (
    classId: string,
    id: string,
    input: ScheduleInput,
    expectedVersion: number,
  ) =>
    (
      await httpClient.post<StudentConflictPreview>(`${base(classId)}/${id}/conflicts/preview`, {
        input,
        expectedVersion,
      })
    ).data,

  audit: async (classId: string, id: string, signal?: AbortSignal) =>
    (await httpClient.get<ScheduleAuditView[]>(`${base(classId)}/${id}/audit`, { signal })).data,

  generate: async (classId: string, payload: GenerateSessionsInput) =>
    (await httpClient.post<SessionOperationResult>(`${base(classId)}/generate`, payload)).data,

  previewGenerate: async (classId: string, payload: GenerateSessionsInput) =>
    (
      await httpClient.post<StudentConflictPreview>(
        `${base(classId)}/generate/conflicts/preview`,
        payload,
      )
    ).data,

  bulkCancel: async (classId: string, payload: CancelRangeRequest) =>
    (await httpClient.post<SessionOperationResult>(`${base(classId)}/cancel-sessions`, payload))
      .data,
};
