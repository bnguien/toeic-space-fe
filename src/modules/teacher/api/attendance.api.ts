import { httpClient } from "@/services/http";

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";
export const attendanceStatusLabels: Record<AttendanceStatus | "NotRecorded", string> = {
  Present: "Có mặt",
  Absent: "Vắng",
  Late: "Đi muộn",
  Excused: "Có phép",
  NotRecorded: "Chưa ghi nhận",
};
export interface AttendanceRecord {
  id: string;
  classSessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
  recordedBy: string;
  recordedAt: string;
  updatedAt: string;
}
export interface AttendanceRosterEntry {
  studentId: string;
  name: string;
  email: string;
  status: AttendanceStatus | "NotRecorded";
  record: AttendanceRecord | null;
}
export interface AttendanceInput {
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
}

const base = (sessionId: string) => `/classroom/api/v1/class-sessions/${sessionId}/attendance`;

export const attendanceApi = {
  roster: async (sessionId: string, search?: string, signal?: AbortSignal) =>
    (
      await httpClient.get<AttendanceRosterEntry[]>(`${base(sessionId)}/roster`, {
        params: { search: search || undefined },
        signal,
      })
    ).data,
  bulk: async (sessionId: string, entries: AttendanceInput[]) => {
    await httpClient.put(base(sessionId), entries);
  },
  remove: async (sessionId: string, studentId: string) => {
    await httpClient.delete(`${base(sessionId)}/${studentId}`);
  },
  mine: async (signal?: AbortSignal) =>
    (
      await httpClient.get<AttendanceRecord[]>("/classroom/api/v1/students/me/attendance", {
        signal,
      })
    ).data,
};
