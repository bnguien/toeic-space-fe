import { coursesApi } from "../api/courses.api";
import type { CourseLesson, LessonMediaDraft, LessonUploadKind } from "../types/course.types";

const VERSION = 1;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MEDIA_KEY = /^courses\/lessons\/[0-9a-f]{32}\/[0-9a-f]{32}\.(?:mp4|pdf|jpg|jpeg|png|webp)$/i;
const GUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export interface LessonDraft {
  version: number;
  savedAt: number;
  title: string;
  description: string;
  textContent: string;
  durationHours: string;
  durationMinutes: string;
  durationSecondsPart: string;
  isFreePreview: boolean;
  savedLessonId: string | null;
  videos: LessonMediaDraft[];
  attachments: LessonMediaDraft[];
  removedResourceIds: string[];
}

export const lessonDraftKey = (courseId: string, moduleId: string, lessonId?: string) =>
  `toeic-space:lesson-draft:${courseId}:${moduleId}:${lessonId ?? "new"}:${lessonId ? "edit" : "create"}`;

const validMedia = (value: unknown, max: number): value is LessonMediaDraft[] =>
  Array.isArray(value) &&
  value.length <= max &&
  new Set(value.map((item) => item?.key)).size === value.length &&
  value.every(
    (item) =>
      typeof item?.key === "string" &&
      MEDIA_KEY.test(item.key) &&
      typeof item.fileName === "string" &&
      item.fileName.length > 0 &&
      item.fileName.length <= 255 &&
      (item.id === undefined || (typeof item.id === "string" && GUID.test(item.id))) &&
      item.previewUrl === undefined,
  );

function validDraft(value: unknown): value is LessonDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as LessonDraft;
  const now = Date.now();
  if (
    draft.version !== VERSION ||
    !Number.isFinite(draft.savedAt) ||
    now - draft.savedAt > MAX_AGE ||
    draft.savedAt > now + 300000
  )
    return false;
  if (
    typeof draft.title !== "string" ||
    draft.title.length > 200 ||
    typeof draft.description !== "string" ||
    draft.description.length > 2000 ||
    typeof draft.textContent !== "string" ||
    draft.textContent.length > 100000 ||
    typeof draft.isFreePreview !== "boolean"
  )
    return false;
  if (
    draft.savedLessonId !== null &&
    (typeof draft.savedLessonId !== "string" || !GUID.test(draft.savedLessonId))
  )
    return false;
  const parts = [draft.durationHours, draft.durationMinutes, draft.durationSecondsPart];
  if (parts.some((part) => typeof part !== "string" || !/^\d{0,6}$/.test(part))) return false;
  return (
    validMedia(draft.videos, 10) &&
    draft.videos.every((item) => item.key.endsWith(".mp4")) &&
    validMedia(draft.attachments, 200) &&
    draft.attachments.every((item) => !item.id && !item.key.endsWith(".mp4")) &&
    Array.isArray(draft.removedResourceIds) &&
    draft.removedResourceIds.length <= 200 &&
    draft.removedResourceIds.every((id) => typeof id === "string" && GUID.test(id))
  );
}

export function readLessonDraft(key: string): LessonDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (validDraft(parsed)) return parsed;
    localStorage.removeItem(key);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Storage unavailable. */
    }
  }
  return null;
}

export function saveLessonDraft(key: string, draft: Omit<LessonDraft, "version" | "savedAt">) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...draft, version: VERSION, savedAt: Date.now() }));
  } catch {
    /* Storage unavailable. */
  }
}

export function clearLessonDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Storage unavailable. */
  }
}

export async function verifyLessonDraftMedia(draft: LessonDraft, lesson?: CourseLesson) {
  const existingVideos = new Map(lesson?.videos.map((video) => [video.objectKey, video]) ?? []);
  const existingResources = new Set(lesson?.resources.map((resource) => resource.objectKey) ?? []);
  const candidates = [
    ...draft.videos.filter((video) => !video.id && !existingVideos.has(video.key)),
    ...draft.attachments.filter((file) => !existingResources.has(file.key)),
  ];
  const confirmed = new Map<string, { kind: LessonUploadKind; fileName: string }>();
  for (let index = 0; index < candidates.length; index += 20) {
    const result = await coursesApi.confirmLessonUploads(
      candidates.slice(index, index + 20).map((item) => item.key),
    );
    for (const item of result.items) {
      if (item.upload)
        confirmed.set(item.key, { kind: item.upload.kind, fileName: item.upload.fileName });
    }
  }
  const videos = draft.videos.flatMap((video) => {
    const existing = existingVideos.get(video.key);
    if (video.id)
      return existing?.id === video.id
        ? [{ key: video.key, fileName: existing.fileName, id: existing.id }]
        : [];
    if (existing)
      return [{ key: existing.objectKey, fileName: existing.fileName, id: existing.id }];
    const upload = confirmed.get(video.key);
    return upload?.kind === "Video" ? [{ key: video.key, fileName: upload.fileName }] : [];
  });
  const attachments = draft.attachments.flatMap((file) => {
    if (existingResources.has(file.key)) return [];
    const upload = confirmed.get(file.key);
    return upload?.kind === "Attachment" ? [{ key: file.key, fileName: upload.fileName }] : [];
  });
  const resourceIds = new Set(lesson?.resources.map((resource) => resource.id) ?? []);
  return {
    videos,
    attachments,
    removedResourceIds: draft.removedResourceIds.filter((id) => resourceIds.has(id)),
    dropped:
      draft.videos.length -
      videos.length +
      draft.attachments.length -
      attachments.length -
      draft.attachments.filter((file) => existingResources.has(file.key)).length,
  };
}
