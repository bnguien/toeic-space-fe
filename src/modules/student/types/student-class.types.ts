export type StudentClassStatus = "Draft" | "Active" | "Completed" | "Archived";

export interface StudentClass {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: StudentClassStatus;
  teacherId: string | null;
  teacherName: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface StudentClassFilters {
  search?: string;
  status?: StudentClassStatus;
  page: number;
  pageSize: number;
}

export interface StudentClassPage {
  items: StudentClass[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface StudentClassDetail {
  class: StudentClass;
}
