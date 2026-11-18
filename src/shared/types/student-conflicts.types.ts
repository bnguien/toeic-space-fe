export interface StudentConflictSession {
  sessionId: string;
  classId: string;
  startAt: string;
  endAt: string;
}

export interface StudentConflictDetail {
  studentId: string;
  first: StudentConflictSession;
  second: StudentConflictSession;
  overlapStart: string;
  overlapEnd: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface StudentConflictPreview {
  affectedStudentCount: number;
  conflictCount: number;
  details: PagedResult<StudentConflictDetail> | null;
}
