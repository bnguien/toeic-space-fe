export type CourseExamType = "ListeningReading" | "SpeakingWriting" | "FourSkills";
export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";
export type CourseStatus = "Draft" | "Published" | "Archived";

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailKey: string | null;
  examType: CourseExamType;
  level: CourseLevel;
  targetScore: number | null;
  price: number;
  capacity: number | null;
  currency: string;
  skills: string[];
  objectives: string[];
  prerequisites: string[];
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  modules?: { id: string; title: string; sortOrder: number }[] | null;
}

export interface CoursePage {
  items: CourseItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  lessons?: CourseLessonSummary[] | null;
}

export interface CourseModulePayload {
  title: string;
  description: string | null;
}

export type LessonStatus = "Draft" | "Published";
export type LessonUploadKind = "Video" | "Attachment";

export interface CourseLessonSummary {
  id: string;
  title: string;
  sortOrder: number;
  status: LessonStatus;
  isFreePreview: boolean;
  durationSeconds: number | null;
}

export interface CourseLessonResource {
  id: string;
  fileName: string;
  objectKey: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
}

export interface CourseLessonVideo {
  id: string;
  fileName: string;
  objectKey: string;
  contentType: string;
  fileSize: number;
  durationSeconds: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface CourseLesson extends CourseLessonSummary {
  moduleId: string;
  description: string | null;
  textContent: string | null;
  createdAt: string;
  updatedAt: string;
  resources: CourseLessonResource[];
  videos: CourseLessonVideo[];
}

export interface CourseLessonPayload {
  title: string;
  description: string | null;
  textContent: string | null;
  videoKeys: string[];
  durationSeconds: number | null;
  isFreePreview: boolean;
}

export interface PresignedLessonUpload {
  key: string;
  uploadUrl: string;
  kind: LessonUploadKind;
  contentType: string;
  expiresAt: string;
}

export interface ConfirmedLessonUpload {
  key: string;
  kind: LessonUploadKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface LessonUploadRequest {
  kind: LessonUploadKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface PresignLessonUploadsResult {
  totalCount: number;
  presignedCount: number;
  failedCount: number;
  items: {
    index: number;
    upload: PresignedLessonUpload | null;
    code: string | null;
    message: string | null;
  }[];
}

export interface ConfirmLessonUploadsResult {
  totalCount: number;
  confirmedCount: number;
  failedCount: number;
  items: {
    key: string;
    upload: ConfirmedLessonUpload | null;
    code: string | null;
    message: string | null;
  }[];
}

export interface AddLessonResourcesResult {
  totalCount: number;
  addedCount: number;
  failedCount: number;
  items: {
    objectKey: string;
    resource: CourseLessonResource | null;
    code: string | null;
    message: string | null;
  }[];
}

export interface LessonMediaDraft {
  key: string;
  fileName: string;
  id?: string;
  previewUrl?: string;
}

export interface CourseLessonPreview {
  lesson: CourseLesson;
  videos: { videoId: string; fileName: string; streamUrl: string; sortOrder: number }[];
  attachments: { resourceId: string; fileName: string; downloadUrl: string }[];
}

export interface CourseFilters {
  search?: string;
  status?: CourseStatus;
  level?: CourseLevel;
  examType?: CourseExamType;
  page: number;
  pageSize: number;
}

export interface CreateCoursePayload {
  code: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailKey?: string | null;
  examType: CourseExamType;
  level: CourseLevel;
  targetScore?: number | null;
  skills?: string[];
  objectives?: string[];
  prerequisites?: string[];
}

export interface UpdateCoursePayload {
  code?: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailKey?: string | null;
  examType: CourseExamType;
  level: CourseLevel;
  targetScore?: number | null;
  skills?: string[];
  objectives?: string[];
  prerequisites?: string[];
}

export interface PresignThumbnailRequest {
  contentType: string;
  sizeBytes: number;
}

export interface PresignedThumbnailResponse {
  key: string;
  uploadUrl: string;
  contentType: string;
  expiresAt: string;
}

export interface ConfirmThumbnailRequest {
  key: string;
}

export interface ConfirmedThumbnailResponse {
  key: string;
  contentType: string;
  sizeBytes: number;
}
