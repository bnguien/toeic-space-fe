import { useMutation } from "@tanstack/react-query";

import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import type {
  RegisterPayload,
  ResendVerificationPayload,
  VerifyEmailPayload,
} from "../types/auth.types";
import { signIn, signOut } from "../utils/session";

export const useCurrentUser = () => useAuthStore((state) => state.user);

export const useSessionStatus = () => useAuthStore((state) => state.status);

export const useLogin = () => useMutation({ mutationFn: signIn });

export const useLogout = () => useMutation({ mutationFn: signOut });

export const useRegister = () =>
  useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
  });

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (payload: VerifyEmailPayload) => authApi.verifyEmail(payload),
  });

export const useResendVerification = () =>
  useMutation({
    mutationFn: (payload: ResendVerificationPayload) => authApi.resendVerification(payload),
  });
