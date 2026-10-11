import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/modules/auth";

import { profileApi } from "../api/profile.api";
import { profileQueryKeys } from "../api/profile.query-keys";
import type { UserProfile } from "../types/profile.types";

export function useProfile() {
  const query = useQuery<UserProfile>({
    queryKey: profileQueryKeys.me(),
    queryFn: () => profileApi.getProfile(),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // Do not retry 401 or 404
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return false;
      return failureCount < 2;
    },
  });

  // Keep shared auth store user synchronized with fetched profile
  useEffect(() => {
    if (query.data) {
      useAuthStore.getState().updateUser({
        fullName: query.data.fullName,
        avatarUrl: query.data.avatarUrl,
      });
    }
  }, [query.data]);

  return query;
}
