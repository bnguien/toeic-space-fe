import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "../api/courses.api";
import { courseKeys } from "../api/courses.query-keys";
import type {
  CourseLessonPayload,
  LessonUploadKind,
  LessonMediaDraft,
} from "../types/course.types";

const lessonKeys = {
  list: (courseId: string, moduleId: string) =>
    [...courseKeys.all, "lessons", courseId, moduleId] as const,
  detail: (courseId: string, moduleId: string, lessonId: string) =>
    [...lessonKeys.list(courseId, moduleId), lessonId] as const,
  preview: (courseId: string, moduleId: string, lessonId: string) =>
    [...lessonKeys.detail(courseId, moduleId, lessonId), "preview"] as const,
};

export const useCourseLessons = (courseId: string, moduleId: string) =>
  useQuery({
    queryKey: lessonKeys.list(courseId, moduleId),
    queryFn: ({ signal }) => coursesApi.lessons(courseId, moduleId, signal),
    retry: false,
  });

export const useCourseLesson = (courseId: string, moduleId: string, lessonId: string | null) =>
  useQuery({
    queryKey: lessonKeys.detail(courseId, moduleId, lessonId ?? ""),
    queryFn: ({ signal }) => coursesApi.lesson(courseId, moduleId, lessonId!, signal),
    enabled: Boolean(lessonId),
    retry: false,
  });

export const useCourseLessonPreview = (
  courseId: string,
  moduleId: string,
  lessonId: string | null,
) =>
  useQuery({
    queryKey: lessonKeys.preview(courseId, moduleId, lessonId ?? ""),
    queryFn: ({ signal }) => coursesApi.lessonPreview(courseId, moduleId, lessonId!, signal),
    enabled: Boolean(lessonId),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });

export function useCourseLessonActions(courseId: string, moduleId: string) {
  const client = useQueryClient();
  const refresh = async () =>
    Promise.all([
      client.invalidateQueries({ queryKey: lessonKeys.list(courseId, moduleId) }),
      client.invalidateQueries({ queryKey: courseKeys.modules(courseId) }),
      client.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
    ]);
  return {
    create: useMutation({
      mutationFn: (payload: CourseLessonPayload) =>
        coursesApi.createLesson(courseId, moduleId, payload),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: CourseLessonPayload }) =>
        coursesApi.updateLesson(courseId, moduleId, id, payload),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => coursesApi.deleteLesson(courseId, moduleId, id),
      onSuccess: refresh,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) => coursesApi.reorderLessons(courseId, moduleId, ids),
      onSuccess: async (lessons) => {
        client.setQueryData(lessonKeys.list(courseId, moduleId), lessons);
        await refresh();
      },
      onError: refresh,
    }),
    publish: useMutation({
      mutationFn: (id: string) => coursesApi.publishLesson(courseId, moduleId, id),
      onSuccess: refresh,
    }),
    unpublish: useMutation({
      mutationFn: (id: string) => coursesApi.unpublishLesson(courseId, moduleId, id),
      onSuccess: refresh,
    }),
    setFreePreview: useMutation({
      mutationFn: ({ id, value }: { id: string; value: boolean }) =>
        coursesApi.setLessonFreePreview(courseId, moduleId, id, value),
      onSuccess: refresh,
    }),
    addResources: useMutation({
      mutationFn: ({ lessonId, keys }: { lessonId: string; keys: string[] }) =>
        coursesApi.addLessonResources(courseId, moduleId, lessonId, keys),
      onSuccess: refresh,
    }),
    removeResource: useMutation({
      mutationFn: ({ lessonId, resourceId }: { lessonId: string; resourceId: string }) =>
        coursesApi.removeLessonResource(courseId, moduleId, lessonId, resourceId),
      onSuccess: refresh,
    }),
  };
}

const supportedMedia: Record<string, { contentType: string; kind: LessonUploadKind }> = {
  mp4: { contentType: "video/mp4", kind: "Video" },
  pdf: { contentType: "application/pdf", kind: "Attachment" },
  jpg: { contentType: "image/jpeg", kind: "Attachment" },
  jpeg: { contentType: "image/jpeg", kind: "Attachment" },
  png: { contentType: "image/png", kind: "Attachment" },
  webp: { contentType: "image/webp", kind: "Attachment" },
};

export interface LessonMediaUploadResult extends LessonMediaDraft {
  error?: string;
}

const mediaError: Record<string, string> = {
  invalid_media: "Định dạng hoặc dung lượng tệp không hợp lệ.",
  upload_expired: "Phiên tải tệp đã hết hạn. Vui lòng chọn lại tệp.",
  upload_missing: "Không tìm thấy tệp đã tải lên.",
  upload_mismatch: "Tệp tải lên không khớp định dạng hoặc dung lượng.",
};

export async function uploadLessonMediaBatch(
  files: File[],
  kind: LessonUploadKind,
  onProgress: (fileName: string, progress: number) => void,
): Promise<LessonMediaUploadResult[]> {
  const results: (LessonMediaUploadResult | undefined)[] = Array(files.length).fill(undefined);
  const valid: { file: File; originalIndex: number; contentType: string }[] = [];
  files.forEach((file, originalIndex) => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const media = supportedMedia[extension];
    const limit = kind === "Video" ? 500 * 1024 * 1024 : 20 * 1024 * 1024;
    if (!media || media.kind !== kind || (file.type && file.type !== media.contentType)) {
      results[originalIndex] = {
        fileName: file.name,
        key: "",
        error: "Định dạng tệp không được hỗ trợ.",
      };
    } else if (!file.size || file.size > limit) {
      results[originalIndex] = {
        fileName: file.name,
        key: "",
        error: kind === "Video" ? "Video tối đa 500 MB." : "Tệp đính kèm tối đa 20 MB.",
      };
    } else {
      valid.push({ file, originalIndex, contentType: media.contentType });
    }
  });

  for (let offset = 0; offset < valid.length; offset += 20) {
    const batch = valid.slice(offset, offset + 20);
    const presigned = await coursesApi.presignLessonUploads(
      batch.map(({ file, contentType }) => ({
        kind,
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      })),
    );
    const ready: { file: File; originalIndex: number; key: string }[] = [];
    for (const item of presigned.items) {
      const source = batch[item.index];
      if (!source) continue;
      if (!item.upload) {
        results[source.originalIndex] = {
          fileName: source.file.name,
          key: "",
          error: mediaError[item.code ?? ""] ?? "Không thể tạo liên kết tải tệp.",
        };
        continue;
      }
      try {
        await coursesApi.uploadLessonMediaToR2(
          item.upload.uploadUrl,
          source.file,
          item.upload.contentType,
          (progress) => onProgress(source.file.name, progress),
        );
        ready.push({
          file: source.file,
          originalIndex: source.originalIndex,
          key: item.upload.key,
        });
      } catch (error) {
        results[source.originalIndex] = {
          fileName: source.file.name,
          key: "",
          error: error instanceof Error ? error.message : "Tải tệp lên thất bại.",
        };
      }
    }
    if (ready.length) {
      const confirmed = await coursesApi.confirmLessonUploads(ready.map((item) => item.key));
      const confirmedByKey = new Map(confirmed.items.map((item) => [item.key, item]));
      for (const item of ready) {
        const outcome = confirmedByKey.get(item.key);
        results[item.originalIndex] = outcome?.upload
          ? { fileName: outcome.upload.fileName, key: outcome.upload.key }
          : {
              fileName: item.file.name,
              key: "",
              error: mediaError[outcome?.code ?? ""] ?? "Không thể xác nhận tệp đã tải lên.",
            };
      }
    }
  }
  return results.map(
    (result, index) =>
      result ?? { fileName: files[index].name, key: "", error: "Không nhận được kết quả tải tệp." },
  );
}
