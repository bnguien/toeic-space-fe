export const UserGender = {
  Male: 1,
  Female: 2,
  Other: 3,
} as const;

export type UserGender = (typeof UserGender)[keyof typeof UserGender];

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: UserGender | number | string | null;
  biography?: string | null;
  targetScore?: number | null;
  currentLevel?: string | null;
}

export interface UpdateUserProfileRequest {
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: UserGender | number;
  biography?: string;
  targetScore?: number;
  currentLevel?: string;
}

export interface GenerateAvatarUploadUrlRequest {
  contentType: "image/webp";
}

export interface GenerateAvatarUploadUrlResponse {
  message: string;
  uploadUrl: string;
}

export type AvatarUploadStage =
  | "idle"
  | "processing" // Client-side decoding, resize, WebP conversion
  | "uploading" // Direct PUT to Cloudflare R2 presigned URL
  | "updating" // PUT /api/v1/users/me with new avatarUrl
  | "success"
  | "error";

export interface AvatarUploadState {
  stage: AvatarUploadStage;
  message?: string;
  progressPercent?: number;
  error?: string | null;
}
