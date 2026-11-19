export type EnrollmentStatus = "Active" | "Withdrawn";

export interface ClassEnrollment {
  id: string;
  classId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  status: EnrollmentStatus;
  enrolledAt: string;
  enrolledBy: string;
  withdrawnAt: string | null;
  withdrawnBy: string | null;
}

export interface EnrollmentFilters {
  status?: EnrollmentStatus;
  studentId?: string;
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface StudentOption {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}

export interface ImportEnrollmentRow {
  rowNumber: number;
  studentId: string | null;
  enrollmentId: string | null;
  code: string | null;
  message: string | null;
}

export interface ImportEnrollmentsResult {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  rows: ImportEnrollmentRow[];
}

export interface BulkEnrollmentResult {
  totalCount: number;
  enrolledCount: number;
  failedCount: number;
  items: {
    index: number;
    studentId: string;
    enrollmentId: string | null;
    code: string | null;
    message: string | null;
  }[];
}
