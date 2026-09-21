import { useMutation } from "@tanstack/react-query";

import { useAuthStore } from "../store/auth.store";
import { signIn, signOut } from "../utils/session";

export const useCurrentUser = () => useAuthStore((state) => state.user);

export const useSessionStatus = () => useAuthStore((state) => state.status);

export const useLogin = () => useMutation({ mutationFn: signIn });

export const useLogout = () => useMutation({ mutationFn: signOut });
