export type SessionMode = "Online" | "Offline";
export type SessionType = "Regular" | "Makeup";
export type SessionStatus = "Scheduled" | "Completed" | "Cancelled";

export interface ScheduleInput {
  classId: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // HH:mm:ss or HH:mm
  endTime: string; // HH:mm:ss or HH:mm
  teacherId: string;
  mode: SessionMode;
  timeZoneId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string; // YYYY-MM-DD
  excludeDates?: string[]; // YYYY-MM-DD[]
}

export interface ClassSchedule {
  id: string;
  classId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  teacherId: string;
  mode: SessionMode;
  timeZoneId: string;
  effectiveFrom: string;
  effectiveTo: string;
  excludeDates: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ScheduleAuditView {
  id: string;
  classScheduleId: string;
  actorId: string;
  changedAt: string;
  action: string;
  previousValue?: string | null;
  newValue: string;
}

export interface SessionInput {
  classId: string;
  teacherId: string;
  title: string;
  description?: string | null;
  sessionType: SessionType;
  startAt: string; // ISO
  endAt: string; // ISO
  mode: SessionMode;
  roomId?: string | null;
  notes?: string | null;
}

export interface SessionEdit {
  teacherId: string;
  title: string;
  description?: string | null;
  startAt: string; // ISO
  endAt: string; // ISO
  mode: SessionMode;
  roomId?: string | null;
  notes?: string | null;
  reason: string;
  expectedVersion: number;
}

export interface SessionView {
  id: string;
  classId: string;
  classScheduleId?: string | null;
  originalLocalDate?: string | null;
  teacherId: string;
  title: string;
  description?: string | null;
  sessionType: SessionType;
  startAt: string;
  endAt: string;
  mode: SessionMode;
  roomId?: string | null;
  roomName?: string | null;
  centerId?: string | null;
  centerName?: string | null;
  centerAddress?: string | null;
  timeZoneId?: string | null;
  status: SessionStatus;
  notes?: string | null;
  cancellationReason?: string | null;
  completedAt?: string | null;
  timeOverridden: boolean;
  roomOverridden: boolean;
  teacherOverridden: boolean;
  modeOverridden: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SessionAuditView {
  id: string;
  classSessionId: string;
  actorId: string;
  changedAt: string;
  action: string;
  reason?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
}

export interface SessionSkip {
  sessionId: string;
  reason: string;
}

export interface SessionOperationResult {
  affected: SessionView[];
  skipped: SessionSkip[];
}

export interface GenerateSessionsInput {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  excludeDates?: string[];
}

export interface CancelRangeRequest {
  from: string; // ISO
  to: string; // ISO
  reason: string;
}

export interface SessionFilters {
  classId?: string;
  teacherId?: string;
  status?: SessionStatus;
  from: string; // ISO
  to: string; // ISO
  page?: number;
  pageSize?: number;
}

export type MeetProvisionStatus =
  "Inactive" | "Pending" | "Provisioning" | "Ready" | "NeedsConnection" | "Failed";

export interface MeetStatusView {
  status: MeetProvisionStatus;
  errorCode: string | null;
  canJoin: boolean;
}

export interface MeetLinkView {
  url: string;
}
