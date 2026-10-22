import axios from "axios";

import { env } from "@/config/env";
import { httpClient } from "@/services/http";

import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  NewPasswordPayload,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetVerification,
  PasswordResetVerificationResponse,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResendVerificationResponse,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from "../types/auth.types";

const AUTH_BASE = "/identity/api/auth";
const PASSWORD_BASE = "/identity/api/v1/auth";

// Required by the API on cookie-authenticated calls; cross-site forms cannot send it.
const CSRF_HEADERS = { "X-CSRF-Protection": "1" };

// Separate client without the auth interceptors, so a failing refresh never triggers another refresh.
const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

export const authApi = {
  requestPasswordReset: async (payload: PasswordResetRequest) =>
    (
      await authClient.post<PasswordResetResponse>(`${PASSWORD_BASE}/password-reset/otp`, payload, {
        headers: CSRF_HEADERS,
      })
    ).data,

  verifyPasswordReset: async (payload: PasswordResetVerification) =>
    (
      await authClient.post<PasswordResetVerificationResponse>(
        `${PASSWORD_BASE}/password-reset/verify`,
        payload,
        { headers: CSRF_HEADERS },
      )
    ).data,

  confirmPasswordReset: async (payload: NewPasswordPayload) => {
    await authClient.post(`${PASSWORD_BASE}/password-reset/confirm`, payload, {
      headers: CSRF_HEADERS,
    });
  },

  requestChangePasswordOtp: async (currentPassword: string) =>
    (
      await httpClient.post<{ cooldownSeconds: number }>(`${PASSWORD_BASE}/change-password/otp`, {
        currentPassword,
      })
    ).data,

  changePassword: async (payload: ChangePasswordPayload) => {
    await httpClient.put(`${PASSWORD_BASE}/change-password`, payload);
  },

  login: async (payload: LoginPayload) =>
    (await authClient.post<AuthResponse>(`${AUTH_BASE}/login`, payload)).data,

  register: async (payload: RegisterPayload) =>
    (await authClient.post<RegisterResponse>(`${AUTH_BASE}/register`, payload)).data,

  verifyEmail: async (payload: VerifyEmailPayload) =>
    (await authClient.post<VerifyEmailResponse>(`${AUTH_BASE}/verify-email`, payload)).data,

  resendVerification: async (payload: ResendVerificationPayload) =>
    (await authClient.post<ResendVerificationResponse>(`${AUTH_BASE}/resend-verification`, payload))
      .data,

  refresh: async () =>
    (await authClient.post<AuthResponse>(`${AUTH_BASE}/refresh`, null, { headers: CSRF_HEADERS }))
      .data,

  logout: async () => {
    await authClient.post(`${AUTH_BASE}/logout`, null, { headers: CSRF_HEADERS });
  },
};
