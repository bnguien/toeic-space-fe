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
