import { useMutation, useQueryClient } from "@tanstack/react-query";

import { broadcastUserUpdate, useAuthStore } from "@/modules/auth";

import { profileApi } from "../api/profile.api";
import { profileQueryKeys } from "../api/profile.query-keys";
import type { UpdateUserProfileRequest, UserProfile } from "../types/profile.types";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserProfileRequest) => profileApi.updateProfile(payload),
    onSuccess: (updatedProfile: UserProfile) => {
      // 1. Synchronize TanStack Query cache
      queryClient.setQueryData(profileQueryKeys.me(), updatedProfile);

      // 2. Synchronize shared auth store (Navbar, Admin sidebar, user dropdown)
      const patch = {
        fullName: updatedProfile.fullName,
        avatarUrl: updatedProfile.avatarUrl,
      };
      useAuthStore.getState().updateUser(patch);
      broadcastUserUpdate(patch);
    },
  });
}
