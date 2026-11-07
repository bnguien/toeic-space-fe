export type ClassStatus = "Draft" | "Active" | "Completed" | "Archived";

export interface ClassItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ClassStatus;
  archivedFromStatus: "Draft" | "Active" | "Completed" | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  teacherId: string | null;
}

export interface ClassInstructor {
  id: string;
  teacherId: string;
  assignedAt: string;
  assignedBy: string;
  unassignedAt: string | null;
  unassignedBy: string | null;
}

export interface ClassDetail {
  class: ClassItem;
  instructorHistory: ClassInstructor[];
}

export interface ClassPage {
  items: ClassItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface DeletedClassItem extends Omit<ClassItem, "status"> {
  status: "Deleted";
}

export interface DeletedClassPage extends Omit<ClassPage, "items"> {
  items: DeletedClassItem[];
}

export interface ClassFilters {
  search?: string;
  status?: ClassStatus;
  teacherId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  page: number;
  pageSize: number;
}

export interface CreateClassPayload {
  code: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateClassPayload {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TeacherOption {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}

export interface TeacherPage {
  items: TeacherOption[];
  page: number;
  pageSize: number;
  totalCount: number;
}
