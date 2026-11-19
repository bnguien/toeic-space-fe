import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { broadcastUserUpdate, useAuthStore } from "@/modules/auth";

import { profileApi } from "../api/profile.api";
import { profileQueryKeys } from "../api/profile.query-keys";
import type { AvatarUploadState, UserProfile } from "../types/profile.types";
import {
  processAvatarImage,
  revokeAvatarPreview,
  type ProcessedAvatarResult,
} from "../utils/avatar-processor";
import {
  getProfileErrorMessage,
  normalizeGenderToEnum,
  resolvePublicAvatarUrl,
} from "../utils/profile-helpers";

interface UseAvatarUploadOptions {
  onSuccess?: (newAvatarUrl: string) => void;
  onError?: (errorMessage: string) => void;
}

export function useAvatarUpload(options?: UseAvatarUploadOptions) {
  const queryClient = useQueryClient();
  const [uploadState, setUploadState] = useState<AvatarUploadState>({
    stage: "idle",
    message: undefined,
    error: null,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const activePreviewRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  // Keep ref up to date for unmount cleanup
  useEffect(() => {
    activePreviewRef.current = previewUrl;
  }, [previewUrl]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (activePreviewRef.current) {
        revokeAvatarPreview(activePreviewRef.current);
      }
    };
  }, []);

  const resetState = useCallback(() => {
    if (activePreviewRef.current) {
      revokeAvatarPreview(activePreviewRef.current);
      activePreviewRef.current = null;
    }
    setPreviewUrl(null);
    setUploadState({ stage: "idle", message: undefined, error: null });
    inFlightRef.current = false;
  }, []);

  const uploadAvatar = useCallback(
    async (file: File) => {
      // Prevent duplicate upload calls while one is running
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;

      // Revoke any previous preview
      if (activePreviewRef.current) {
        revokeAvatarPreview(activePreviewRef.current);
        activePreviewRef.current = null;
        setPreviewUrl(null);
      }

      let processedResult: ProcessedAvatarResult | null = null;

      try {
        // Stage 1: Client-side Image Processing
        setUploadState({
          stage: "processing",
          message: "Đang xử lý và tối ưu ảnh...",
          error: null,
        });

        processedResult = await processAvatarImage(file);
        setPreviewUrl(processedResult.previewUrl);
        activePreviewRef.current = processedResult.previewUrl;

        // Stage 2: Generate Presigned URL & Upload to Cloudflare R2
        setUploadState({
          stage: "uploading",
          message: "Đang tải ảnh lên hệ thống...",
          error: null,
        });

        // 2a. Request presigned upload URL
        const presignedResponse = await profileApi.generateAvatarUploadUrl({
          contentType: "image/webp",
        });

        if (!presignedResponse?.uploadUrl) {
          throw new Error("Không nhận được đường dẫn tải lên từ máy chủ.");
        }

        // 2b. PUT WebP Blob directly to R2 presigned URL
        await profileApi.uploadAvatarToR2(presignedResponse.uploadUrl, processedResult.blob);

        // Stage 3: Determine Public Avatar URL and update User Profile
        setUploadState({
          stage: "updating",
          message: "Đang cập nhật thông tin ảnh đại diện...",
          error: null,
        });

        const publicAvatarUrl = resolvePublicAvatarUrl(presignedResponse.uploadUrl);

        // Fetch current cached profile or latest profile to preserve existing fields
        const currentProfile =
          queryClient.getQueryData<UserProfile>(profileQueryKeys.me()) ??
          (await profileApi.getProfile());

        const updatedProfile = await profileApi.updateProfile({
          fullName: currentProfile.fullName,
          phone: currentProfile.phone ?? undefined,
          avatarUrl: publicAvatarUrl,
          dateOfBirth: currentProfile.dateOfBirth ?? undefined,
          gender: normalizeGenderToEnum(currentProfile.gender),
          biography: currentProfile.biography ?? undefined,
          targetScore: currentProfile.targetScore ?? undefined,
          currentLevel: currentProfile.currentLevel ?? undefined,
        });

        // Stage 4: Synchronize state & Cache
        queryClient.setQueryData(profileQueryKeys.me(), updatedProfile);
        const userPatch = {
          fullName: updatedProfile.fullName,
          avatarUrl: updatedProfile.avatarUrl,
        };
        useAuthStore.getState().updateUser(userPatch);
        broadcastUserUpdate(userPatch);

        setUploadState({
          stage: "success",
          message: "Cập nhật ảnh đại diện thành công.",
          error: null,
        });

        options?.onSuccess?.(publicAvatarUrl);
      } catch (err) {
        const errorMsg = getProfileErrorMessage(err);

        // On error, revert preview and keep current avatar
        if (activePreviewRef.current) {
          revokeAvatarPreview(activePreviewRef.current);
          activePreviewRef.current = null;
          setPreviewUrl(null);
        }

        setUploadState({
          stage: "error",
          message: undefined,
          error: errorMsg,
        });

        options?.onError?.(errorMsg);
      } finally {
        inFlightRef.current = false;
      }
    },
    [options, queryClient],
  );

  return {
    uploadAvatar,
    uploadState,
    previewUrl,
    isUploading:
      uploadState.stage === "processing" ||
      uploadState.stage === "uploading" ||
      uploadState.stage === "updating",
    resetState,
  };
}
