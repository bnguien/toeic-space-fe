import axios from "axios";

import { env } from "@/config/env";

import type { AuthResponse, LoginPayload } from "../types/auth.types";

const AUTH_BASE = "/identity/api/auth";

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
  login: async (payload: LoginPayload) =>
    (await authClient.post<AuthResponse>(`${AUTH_BASE}/login`, payload)).data,

  refresh: async () =>
    (await authClient.post<AuthResponse>(`${AUTH_BASE}/refresh`, null, { headers: CSRF_HEADERS }))
      .data,

  logout: async () => {
    await authClient.post(`${AUTH_BASE}/logout`, null, { headers: CSRF_HEADERS });
  },
};
