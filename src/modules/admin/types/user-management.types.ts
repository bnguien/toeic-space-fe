import type { z } from "zod";

import type { UserRole } from "@/modules/auth";
import type {
  createUserResponseSchema,
  managedUserDetailSchema,
  managedUserSchema,
  userStatisticsSchema,
} from "../api/schemas";

/** `Inactive` means the email address has not been verified yet. */
export type ManagedUserStatus = "Active" | "Inactive" | "Suspended";

export type ManagedUserSort = "Newest" | "Oldest" | "Name" | "LastActive";

/** Row of `GET /identity/api/v1/admin/users`. */
export type ManagedUser = z.infer<typeof managedUserSchema>;

export type ManagedUserDetail = z.infer<typeof managedUserDetailSchema>;

export interface ManagedUserPage {
  items: ManagedUser[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Every count except `deleted` excludes soft-deleted accounts.
 * `registrations` holds the last 14 days, oldest first.
 */
export type UserStatistics = z.infer<typeof userStatisticsSchema>;

export interface UserListFilters {
  search?: string;
  role?: UserRole;
  status?: ManagedUserStatus;
  deleted?: boolean;
  sort?: ManagedUserSort;
  page: number;
  pageSize: number;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

export interface UpdateUserPayload {
  fullName: string;
  phone: string | null;
}

/** The temporary password is only returned once, right after creation. */
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;
