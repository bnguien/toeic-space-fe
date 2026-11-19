import { httpClient } from "@/services/http";
import type { UserRole } from "@/modules/auth";
import type { TimeRange } from "../components/ui/timeRange";
import type {
  CreateUserPayload,
  ManagedUserStatus,
  UpdateUserPayload,
  UserListFilters,
} from "../types/user-management.types";
import {
  createUserResponseSchema,
  managedUserDetailSchema,
  managedUserSchema,
  pageSchema,
  parseResponse,
  userStatisticsSchema,
} from "./schemas";

const base = "/identity/api/v1/admin/users";
const userPage = pageSchema(managedUserSchema);

/** Minutes east of UTC, so daily registrations follow the administrator's calendar. */
const timeZoneOffset = () => -new Date().getTimezoneOffset();

/** Every endpoint here requires an Admin session; the API answers 403 to anyone else. */
export const usersApi = {
  list: async (filters: UserListFilters, signal?: AbortSignal) =>
    parseResponse(
      userPage,
      (await httpClient.get(base, { params: filters, signal })).data,
      "admin/users",
    ),
  statistics: async (role: UserRole | undefined, period: TimeRange, signal?: AbortSignal) =>
    parseResponse(
      userStatisticsSchema,
      (
        await httpClient.get(`${base}/stats`, {
          params: { role, period, tzOffset: timeZoneOffset() },
          signal,
        })
      ).data,
      "admin/users/stats",
    ),
  detail: async (id: string, signal?: AbortSignal) =>
    parseResponse(
      managedUserDetailSchema,
      (await httpClient.get(`${base}/${id}`, { signal })).data,
      "admin/users/{id}",
    ),
  create: async (payload: CreateUserPayload) =>
    parseResponse(
      createUserResponseSchema,
      (await httpClient.post(base, payload)).data,
      "POST admin/users",
    ),
  update: async (id: string, payload: UpdateUserPayload) =>
    parseResponse(
      managedUserDetailSchema,
      (await httpClient.put(`${base}/${id}`, payload)).data,
      "PUT admin/users/{id}",
    ),
  changeRole: async (id: string, role: UserRole) =>
    parseResponse(
      managedUserDetailSchema,
      (await httpClient.put(`${base}/${id}/role`, { role })).data,
      "PUT admin/users/{id}/role",
    ),
  changeStatus: async (id: string, status: Exclude<ManagedUserStatus, "Inactive">) =>
    parseResponse(
      managedUserDetailSchema,
      (await httpClient.put(`${base}/${id}/status`, { status })).data,
      "PUT admin/users/{id}/status",
    ),
  revokeSessions: async (id: string) => {
    await httpClient.post(`${base}/${id}/sessions/revoke`);
  },
  remove: async (id: string) => {
    await httpClient.delete(`${base}/${id}`);
  },
  restore: async (id: string) =>
    parseResponse(
      managedUserDetailSchema,
      (await httpClient.post(`${base}/${id}/restore`)).data,
      "POST admin/users/{id}/restore",
    ),
};
