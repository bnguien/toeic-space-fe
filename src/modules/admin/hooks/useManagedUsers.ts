import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser, type UserRole } from "@/modules/auth";
import { usersApi } from "../api/users.api";
import { userKeys } from "../api/users.query-keys";
import { DEFAULT_TIME_RANGE, type TimeRange } from "../components/ui/timeRange";
import type {
  CreateUserPayload,
  ManagedUserDetail,
  ManagedUserStatus,
  UpdateUserPayload,
  UserListFilters,
} from "../types/user-management.types";

/**
 * User management is Admin-only on the API. Teachers share the admin shell, so these queries
 * stay disabled for them instead of producing 403 errors.
 */
export const useIsAdmin = () => useCurrentUser()?.role === "Admin";

export const useUserList = (filters: UserListFilters) =>
  useQuery({
    queryKey: userKeys.list(filters),
    queryFn: ({ signal }) => usersApi.list(filters, signal),
    enabled: useIsAdmin(),
    placeholderData: keepPreviousData,
    retry: false,
  });

/** Counts of a role and its trend; `period` only changes the trend. */
export const useUserStatistics = (role?: UserRole, period: TimeRange = DEFAULT_TIME_RANGE) =>
  useQuery({
    queryKey: userKeys.statistics(role, period),
    queryFn: ({ signal }) => usersApi.statistics(role, period, signal),
    placeholderData: keepPreviousData,
    enabled: useIsAdmin(),
    staleTime: 30 * 1000,
    retry: false,
  });

export const useUserDetail = (id: string | null) =>
  useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: ({ signal }) => usersApi.detail(id!, signal),
    enabled: useIsAdmin() && Boolean(id),
    retry: false,
  });

/**
 * Every change can move a user between lists and counts, so all user queries are refreshed.
 * The returned detail is written to the cache first to avoid a flash of stale data.
 */
const useUserMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (isDetail(result)) {
        queryClient.setQueryData(userKeys.detail(result.id), result);
      }
      return queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

const isDetail = (value: unknown): value is ManagedUserDetail =>
  typeof value === "object" && value !== null && "activeSessionCount" in value;

export const useCreateUser = () =>
  useUserMutation((payload: CreateUserPayload) => usersApi.create(payload));

export const useUpdateUser = (id: string) =>
  useUserMutation((payload: UpdateUserPayload) => usersApi.update(id, payload));

export const useChangeUserRole = (id: string) =>
  useUserMutation((role: UserRole) => usersApi.changeRole(id, role));

export const useChangeUserStatus = (id: string) =>
  useUserMutation((status: Exclude<ManagedUserStatus, "Inactive">) =>
    usersApi.changeStatus(id, status),
  );

export const useRevokeUserSessions = (id: string) =>
  useUserMutation(() => usersApi.revokeSessions(id));

export const useDeleteUser = (id: string) => useUserMutation(() => usersApi.remove(id));

export const useRestoreUser = () => useUserMutation((id: string) => usersApi.restore(id));
