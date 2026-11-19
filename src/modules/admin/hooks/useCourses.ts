import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "../api/courses.api";
import { courseKeys } from "../api/courses.query-keys";
import type {
  CourseFilters,
  CourseModulePayload,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";

export const useCourses = (filters: CourseFilters, enabled = true) =>
  useQuery({
    queryKey: courseKeys.list(filters),
    queryFn: ({ signal }) => coursesApi.list(filters, signal),
    enabled,
  });

export const useCourseDetail = (id: string | null) =>
  useQuery({
    queryKey: courseKeys.detail(id ?? ""),
    queryFn: ({ signal }) => coursesApi.get(id!, signal),
    enabled: Boolean(id),
  });

export const useCourseModules = (courseId: string | null) =>
  useQuery({
    queryKey: courseKeys.modules(courseId ?? ""),
    queryFn: ({ signal }) => coursesApi.modules(courseId!, signal),
    enabled: Boolean(courseId),
    retry: false,
  });

export function useCourseActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: courseKeys.all });

  return {
    pricing: useMutation({
      mutationFn: ({
        id,
        price,
        capacity,
      }: {
        id: string;
        price: number;
        capacity: number | null;
      }) => coursesApi.updatePricing(id, price, capacity),
      onSuccess: refresh,
    }),
    create: useMutation({
      mutationFn: (payload: CreateCoursePayload) => coursesApi.create(payload),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateCoursePayload }) =>
        coursesApi.update(id, payload),
      onSuccess: refresh,
    }),
    publish: useMutation({
      mutationFn: (id: string) => coursesApi.publish(id),
      onSuccess: refresh,
    }),
    archive: useMutation({
      mutationFn: (id: string) => coursesApi.archive(id),
      onSuccess: refresh,
    }),
    restore: useMutation({
      mutationFn: (id: string) => coursesApi.restore(id),
      onSuccess: refresh,
    }),
  };
}

export function useCourseModuleActions(courseId: string) {
  const client = useQueryClient();
  const key = courseKeys.modules(courseId);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
    ]);
  };
  return {
    create: useMutation({
      mutationFn: (payload: CourseModulePayload) => coursesApi.createModule(courseId, payload),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: CourseModulePayload }) =>
        coursesApi.updateModule(courseId, id, payload),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => coursesApi.deleteModule(courseId, id),
      onSuccess: refresh,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) => coursesApi.reorderModules(courseId, ids),
      onSuccess: async (modules) => {
        client.setQueryData(key, modules);
        await client.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      },
      onError: refresh,
    }),
  };
}

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export function useCourseThumbnailUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadThumbnail = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        throw new Error("Ảnh đại diện chỉ hỗ trợ định dạng JPEG, PNG hoặc WebP.");
      }

      if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
        throw new Error("Dung lượng ảnh phải từ 1 byte đến tối đa 5 MB.");
      }

      // 1. Presign
      const presigned = await coursesApi.presignThumbnail({
        contentType: file.type,
        sizeBytes: file.size,
      });

      // 2. Direct upload to R2 using native fetch (no Bearer token)
      await coursesApi.uploadThumbnailToR2(presigned.uploadUrl, file, file.type);

      // 3. Confirm
      const confirmed = await coursesApi.confirmThumbnail({
        key: presigned.key,
      });

      // Update local preview
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      return confirmed.key;
    } catch (error) {
      const msg = courseErrorMessage(error);
      setUploadError(msg);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const clearUpload = useCallback(() => {
    setPreviewUrl(null);
    setUploadError(null);
    setIsUploading(false);
  }, []);

  return {
    uploadThumbnail,
    isUploading,
    uploadError,
    previewUrl,
    setPreviewUrl,
    clearUpload,
    setUploadError,
  };
}
