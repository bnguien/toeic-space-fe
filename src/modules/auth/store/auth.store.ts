import { create } from "zustand";

import type { AuthResponse, AuthUser, SessionStatus } from "../types/auth.types";

interface AuthState {
  status: SessionStatus;
  user: AuthUser | null;
  /** Kept in memory only: never written to localStorage, sessionStorage or cookies. */
  accessToken: string | null;
  setRestoring: () => void;
  setSession: (response: AuthResponse) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "idle",
  user: null,
  accessToken: null,
  setRestoring: () => set({ status: "restoring" }),
  setSession: (response) =>
    set({ status: "authenticated", user: response.user, accessToken: response.accessToken }),
  clearSession: () => set({ status: "anonymous", user: null, accessToken: null }),
}));
