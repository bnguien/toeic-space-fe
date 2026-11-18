import type { StudentConflictPreview } from "../types/student-conflicts.types";

export type StudentConflictPreviewOutcome<T> =
  | { kind: "saved"; result: T }
  | {
      kind: "warning";
      preview: StudentConflictPreview;
      proceed: () => Promise<T>;
    };

export class StudentConflictPreviewError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super("Student schedule conflict preview failed.");
    this.name = "StudentConflictPreviewError";
    this.cause = cause;
  }
}

export const isStudentConflictPreviewError = (
  error: unknown,
): error is StudentConflictPreviewError => error instanceof StudentConflictPreviewError;

export const hasStudentConflicts = (preview: StudentConflictPreview) =>
  preview.affectedStudentCount > 0 || preview.conflictCount > 0;

/** A failed preview throws before save; a warning returns the deferred save for explicit consent. */
export async function previewStudentConflictsBeforeSave<T>(
  previewRequest: () => Promise<StudentConflictPreview>,
  save: () => Promise<T>,
): Promise<StudentConflictPreviewOutcome<T>> {
  let preview: StudentConflictPreview;
  try {
    preview = await previewRequest();
  } catch (error) {
    throw new StudentConflictPreviewError(error);
  }
  if (hasStudentConflicts(preview)) return { kind: "warning", preview, proceed: save };
  return { kind: "saved", result: await save() };
}
