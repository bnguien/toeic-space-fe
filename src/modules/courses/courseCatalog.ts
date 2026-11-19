import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/services/http/httpClient";
import type { CourseExamType, CourseLevel } from "@/modules/admin";

const base = "/content/api/v1/public/courses";
export interface PublicCourseSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  examType: CourseExamType;
  level: CourseLevel;
  targetScore: number | null;
  price: number;
  promotion: {
    promotionId: string;
    name: string;
    originalPrice: number;
    discountAmount: number;
    sellingPrice: number;
    expiresAt: string;
  } | null;
  capacity: number | null;
  remainingSeats: number | null;
  currency: string;
}
export interface PublicLesson {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  isFreePreview: boolean;
}
export interface PublicModule {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: PublicLesson[];
}
export interface PublicCourseDetail extends PublicCourseSummary {
  description: string | null;
  skills: string[];
  objectives: string[];
  prerequisites: string[];
  modules: PublicModule[];
}
export interface PublicPreview {
  id: string;
  title: string;
  textContent: string | null;
  videos: {
    id: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    durationSeconds: number | null;
    sortOrder: number;
    url: string;
  }[];
  attachments: {
    id: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    url: string;
  }[];
}
export interface BrowseParams {
  search: string;
  examType: string;
  level: string;
  targetScore: string;
  page: number;
}
interface CoursePage {
  items: PublicCourseSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const examLabels: Record<CourseExamType, string> = {
  ListeningReading: "Nghe và Đọc",
  SpeakingWriting: "Nói và Viết",
  FourSkills: "Bốn kỹ năng",
};
export const levelLabels: Record<CourseLevel, string> = {
  Beginner: "Cơ bản",
  Intermediate: "Trung cấp",
  Advanced: "Nâng cao",
};
export const isExamType = (value: string): value is CourseExamType => value in examLabels;
export const isLevel = (value: string): value is CourseLevel => value in levelLabels;
export const durationLabel = (seconds: number | null) => {
  if (seconds === null) return "Chưa có thời lượng";
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

export const usePublicCourses = (filters: BrowseParams) =>
  useQuery({
    queryKey: ["public-courses", filters],
    queryFn: async () =>
      (
        await httpClient.get<CoursePage>(base, {
          params: {
            search: filters.search || undefined,
            examType: filters.examType || undefined,
            level: filters.level || undefined,
            targetScore: filters.targetScore || undefined,
            page: filters.page,
          },
        })
      ).data,
    retry: false,
    refetchOnMount: "always",
  });
export const usePublicCourse = (id: string | undefined) =>
  useQuery({
    queryKey: ["public-course", id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async ({ signal }) =>
      (await httpClient.get<PublicCourseDetail>(`${base}/${id}`, { signal })).data,
  });
export const usePublicPreview = (courseId: string | undefined, lessonId: string | undefined) =>
  useQuery({
    queryKey: ["public-preview", courseId, lessonId],
    enabled: Boolean(courseId && lessonId),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 0,
    queryFn: async ({ signal }) =>
      (
        await httpClient.get<PublicPreview>(`${base}/${courseId}/lessons/${lessonId}/preview`, {
          signal,
        })
      ).data,
  });
