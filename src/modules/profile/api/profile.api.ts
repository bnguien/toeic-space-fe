import { httpClient } from "@/services/http";

import type {
  GenerateAvatarUploadUrlRequest,
  GenerateAvatarUploadUrlResponse,
  UpdateUserProfileRequest,
  UserProfile,
} from "../types/profile.types";
import { normalizeAvatarUrl } from "../utils/profile-helpers";

const USERS_ME_BASE = "/identity/api/v1/users/me";

export const profileApi = {
  /**
   * GET /api/v1/users/me
   * Fetches the current authenticated user's profile.
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await httpClient.get<UserProfile>(USERS_ME_BASE);
    return {
      ...response.data,
      avatarUrl: normalizeAvatarUrl(response.data.avatarUrl),
    };
  },

  /**
   * PUT /api/v1/users/me
   * Updates the current authenticated user's profile information.
   */
  updateProfile: async (payload: UpdateUserProfileRequest): Promise<UserProfile> => {
    const response = await httpClient.put<UserProfile>(USERS_ME_BASE, payload);
    return {
      ...response.data,
      avatarUrl: normalizeAvatarUrl(response.data.avatarUrl),
    };
  },

  /**
   * POST /api/v1/users/me/avatar
   * Generates a 15-minute presigned R2 upload URL for the authenticated user.
   */
  generateAvatarUploadUrl: async (
    payload: GenerateAvatarUploadUrlRequest = { contentType: "image/webp" },
  ): Promise<GenerateAvatarUploadUrlResponse> => {
    const response = await httpClient.post<GenerateAvatarUploadUrlResponse>(
      `${USERS_ME_BASE}/avatar`,
      payload,
    );
    return response.data;
  },

  /**
   * Directly uploads the processed WebP image Blob to Cloudflare R2 using the presigned URL.
   * Uses native fetch so NO Bearer token is attached, and exact Content-Type: image/webp is sent.
   */
  uploadAvatarToR2: async (uploadUrl: string, blob: Blob): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "image/webp",
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed with status ${response.status}`);
    }
  },
};
