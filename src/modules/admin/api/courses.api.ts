import { httpClient } from "@/services/http";
import type {
  ConfirmedThumbnailResponse,
  ConfirmLessonUploadsResult,
  ConfirmThumbnailRequest,
  CourseFilters,
  CourseItem,
  CourseModule,
  CourseModulePayload,
  CourseLesson,
  CourseLessonPayload,
  CourseLessonPreview,
  AddLessonResourcesResult,
  CourseLessonSummary,
  CoursePage,
  CreateCoursePayload,
  PresignedThumbnailResponse,
  PresignThumbnailRequest,
  LessonUploadRequest,
  PresignLessonUploadsResult,
  UpdateCoursePayload,
} from "../types/course.types";

const coursesBase = "/content/api/v1/courses";
const uploadsBase = "/content/api/v1/uploads";
const modulesBase = (courseId: string) => `${coursesBase}/${courseId}/modules`;
const lessonsBase = (courseId: string, moduleId: string) =>
  `${modulesBase(courseId)}/${moduleId}/lessons`;
const lessonUploadsBase = "/content/api/v1/uploads/lessons";

export const coursesApi = {
  modules: async (courseId: string, signal?: AbortSignal): Promise<CourseModule[]> =>
    (await httpClient.get<CourseModule[]>(modulesBase(courseId), { signal })).data,
  createModule: async (courseId: string, payload: CourseModulePayload) =>
    (await httpClient.post<CourseModule>(modulesBase(courseId), payload)).data,
  updateModule: async (courseId: string, moduleId: string, payload: CourseModulePayload) =>
    (await httpClient.put<CourseModule>(`${modulesBase(courseId)}/${moduleId}`, payload)).data,
  deleteModule: async (courseId: string, moduleId: string) => {
    await httpClient.delete(`${modulesBase(courseId)}/${moduleId}`);
  },
  reorderModules: async (courseId: string, moduleIds: string[]) =>
    (await httpClient.put<CourseModule[]>(`${modulesBase(courseId)}/order`, { moduleIds })).data,
  lessons: async (courseId: string, moduleId: string, signal?: AbortSignal) =>
    (await httpClient.get<CourseLessonSummary[]>(lessonsBase(courseId, moduleId), { signal })).data,
  lesson: async (courseId: string, moduleId: string, lessonId: string, signal?: AbortSignal) =>
    (
      await httpClient.get<CourseLesson>(`${lessonsBase(courseId, moduleId)}/${lessonId}`, {
        signal,
      })
    ).data,
  createLesson: async (courseId: string, moduleId: string, payload: CourseLessonPayload) =>
    (await httpClient.post<CourseLesson>(lessonsBase(courseId, moduleId), payload)).data,
  updateLesson: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    payload: CourseLessonPayload,
  ) =>
    (await httpClient.put<CourseLesson>(`${lessonsBase(courseId, moduleId)}/${lessonId}`, payload))
      .data,
  deleteLesson: async (courseId: string, moduleId: string, lessonId: string) => {
    await httpClient.delete(`${lessonsBase(courseId, moduleId)}/${lessonId}`);
  },
  reorderLessons: async (courseId: string, moduleId: string, lessonIds: string[]) =>
    (
      await httpClient.put<CourseLessonSummary[]>(`${lessonsBase(courseId, moduleId)}/order`, {
        lessonIds,
      })
    ).data,
  publishLesson: async (courseId: string, moduleId: string, lessonId: string) =>
    (await httpClient.post<CourseLesson>(`${lessonsBase(courseId, moduleId)}/${lessonId}/publish`))
      .data,
  unpublishLesson: async (courseId: string, moduleId: string, lessonId: string) =>
    (
      await httpClient.post<CourseLesson>(
        `${lessonsBase(courseId, moduleId)}/${lessonId}/unpublish`,
      )
    ).data,
  setLessonFreePreview: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    isFreePreview: boolean,
  ) =>
    (
      await httpClient.patch<CourseLesson>(
        `${lessonsBase(courseId, moduleId)}/${lessonId}/free-preview`,
        { isFreePreview },
      )
    ).data,
  addLessonResources: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    objectKeys: string[],
  ) =>
    (
      await httpClient.post<AddLessonResourcesResult>(
        `${lessonsBase(courseId, moduleId)}/${lessonId}/resources/bulk`,
        { objectKeys },
      )
    ).data,
  removeLessonResource: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    resourceId: string,
  ) => {
    await httpClient.delete(
      `${lessonsBase(courseId, moduleId)}/${lessonId}/resources/${resourceId}`,
    );
  },
  lessonPreview: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    signal?: AbortSignal,
  ) =>
    (
      await httpClient.get<CourseLessonPreview>(
        `${lessonsBase(courseId, moduleId)}/${lessonId}/preview`,
        { signal },
      )
    ).data,
  presignLessonUploads: async (files: LessonUploadRequest[]) =>
    (
      await httpClient.post<PresignLessonUploadsResult>(`${lessonUploadsBase}/presign/bulk`, {
        files,
      })
    ).data,
  confirmLessonUploads: async (keys: string[]) =>
    (
      await httpClient.post<ConfirmLessonUploadsResult>(`${lessonUploadsBase}/confirm/bulk`, {
        keys,
      })
    ).data,
  uploadLessonMediaToR2: async (
    uploadUrl: string,
    file: File,
    contentType: string,
    onProgress: (progress: number) => void,
  ) =>
    new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", uploadUrl);
      request.setRequestHeader("Content-Type", contentType);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () =>
        request.status >= 200 && request.status < 300
          ? resolve()
          : reject(new Error(`Tải tệp lên kho lưu trữ thất bại (${request.status}).`));
      request.onerror = () => reject(new Error("Không thể kết nối kho lưu trữ. Vui lòng thử lại."));
      request.onabort = () => reject(new Error("Đã hủy tải tệp lên."));
      request.send(file);
    }),
  list: async (filters: CourseFilters, signal?: AbortSignal): Promise<CoursePage> => {
    const params = {
      search: filters.search || undefined,
      status: filters.status || undefined,
      level: filters.level || undefined,
      examType: filters.examType || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    };
    const response = await httpClient.get<CoursePage>(coursesBase, { params, signal });
    return response.data;
  },

  get: async (id: string, signal?: AbortSignal): Promise<CourseItem> => {
    const response = await httpClient.get<CourseItem>(`${coursesBase}/${id}`, { signal });
    return response.data;
  },

  create: async (payload: CreateCoursePayload): Promise<CourseItem> => {
    const response = await httpClient.post<CourseItem>(coursesBase, payload);
    return response.data;
  },

  update: async (id: string, payload: UpdateCoursePayload): Promise<CourseItem> => {
    const response = await httpClient.put<CourseItem>(`${coursesBase}/${id}`, payload);
    return response.data;
  },

  publish: async (id: string): Promise<CourseItem> => {
    const response = await httpClient.post<CourseItem>(`${coursesBase}/${id}/publish`);
    return response.data;
  },

  archive: async (id: string): Promise<CourseItem> => {
    const response = await httpClient.post<CourseItem>(`${coursesBase}/${id}/archive`);
    return response.data;
  },

  restore: async (id: string): Promise<CourseItem> => {
    const response = await httpClient.post<CourseItem>(`${coursesBase}/${id}/restore`);
    return response.data;
  },

  presignThumbnail: async (
    payload: PresignThumbnailRequest,
  ): Promise<PresignedThumbnailResponse> => {
    const response = await httpClient.post<PresignedThumbnailResponse>(
      `${uploadsBase}/presign`,
      payload,
    );
    return response.data;
  },

  /**
   * Directly uploads the thumbnail image to Cloudflare R2 using the presigned URL.
   * Uses native fetch so NO Bearer token is attached to R2.
   */
  uploadThumbnailToR2: async (
    uploadUrl: string,
    file: Blob | File,
    contentType: string,
  ): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed with status ${response.status}`);
    }
  },

  confirmThumbnail: async (
    payload: ConfirmThumbnailRequest,
  ): Promise<ConfirmedThumbnailResponse> => {
    const response = await httpClient.post<ConfirmedThumbnailResponse>(
      `${uploadsBase}/confirm`,
      payload,
    );
    return response.data;
  },
};
