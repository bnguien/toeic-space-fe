export type TeacherClassStatus = "Draft" | "Active" | "Completed" | "Archived";

export interface TeacherClass {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: TeacherClassStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  teacherId: string | null;
  defaultRoomId?: string | null;
}

export interface TeacherClassPage {
  items: TeacherClass[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface TeacherClassDetail {
  class: TeacherClass;
  instructorHistory: never[];
}

export interface TeacherClassStudent {
  id: string;
  classId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  status: "Active" | "Withdrawn";
  enrolledAt: string;
  enrolledBy: string;
  withdrawnAt: string | null;
  withdrawnBy: string | null;
}

export interface TeacherClassStudentPage {
  items: TeacherClassStudent[];
  page: number;
  pageSize: number;
  totalCount: number;
}
