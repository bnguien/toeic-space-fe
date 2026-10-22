import type { UserRole } from "@/modules/auth";
import type { TimeRange } from "../components/ui/timeRange";
import type { UserListFilters } from "../types/user-management.types";

export const userKeys = {
  all: ["admin", "users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserListFilters) => [...userKeys.lists(), filters] as const,
  statistics: (role: UserRole | undefined, period: TimeRange) =>
    [...userKeys.all, "statistics", role ?? "all", period] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};
