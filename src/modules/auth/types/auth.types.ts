export type UserRole = "Admin" | "Teacher" | "User";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  expiresAt: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  userId: string;
  challengeId: string;
}

export interface VerifyEmailPayload {
  challengeId: string;
  otp: string;
}

export interface VerifyEmailResponse {
  userId: string;
  emailVerifiedAt: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ResendVerificationResponse {
  userId: string;
  challengeId: string;
}

export interface VerificationFlowState {
  email: string;
  challengeId: string;
  userId?: string;
}

export type SessionStatus = "idle" | "restoring" | "authenticated" | "anonymous";
