import { httpClient } from "@/services/http";
import { repairVietnameseText } from "@/shared/utils/text";
import type { TeacherClassDetail, TeacherClassPage } from "../types/teacher.types";

const base = "/classroom/api/v1/classes";

export const teacherClassesApi = {
  list: async (page: number, signal: AbortSignal) =>
    repairClassPage(
      (
        await httpClient.get<TeacherClassPage>(`${base}/me`, {
          params: { page, pageSize: 20 },
          signal,
        })
      ).data,
    ),
  detail: async (id: string, signal: AbortSignal) =>
    repairClassDetail((await httpClient.get<TeacherClassDetail>(`${base}/${id}`, { signal })).data),
};

const repairClassDetail = (detail: TeacherClassDetail): TeacherClassDetail => ({
  ...detail,
  class: {
    ...detail.class,
    code: repairVietnameseText(detail.class.code),
    name: repairVietnameseText(detail.class.name),
    description: detail.class.description ? repairVietnameseText(detail.class.description) : null,
  },
});

const repairClassPage = (page: TeacherClassPage): TeacherClassPage => ({
  ...page,
  items: page.items.map((item) => ({
    ...item,
    code: repairVietnameseText(item.code),
    name: repairVietnameseText(item.name),
    description: item.description ? repairVietnameseText(item.description) : null,
  })),
});
