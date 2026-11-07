import type { ClassFilters } from "../types/class.types";

export const classKeys = {
  all: ["classes"] as const,
  lists: () => [...classKeys.all, "list"] as const,
  list: (filters: ClassFilters) => [...classKeys.lists(), filters] as const,
  deleted: (search: string, page: number) => [...classKeys.all, "deleted", search, page] as const,
  mine: (page: number) => [...classKeys.all, "mine", page] as const,
  details: () => [...classKeys.all, "detail"] as const,
  detail: (id: string) => [...classKeys.details(), id] as const,
  teachers: (search: string) => [...classKeys.all, "teachers", search] as const,
};
