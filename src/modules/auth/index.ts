export { authRoutes } from "./routes";
export { RequireAuth } from "./components/RequireAuth";
export { RegisterPage } from "./pages/RegisterPage";
export { VerifyEmailPage } from "./pages/VerifyEmailPage";
export {
  useCurrentUser,
  useLogout,
  useRegister,
  useResendVerification,
  useSessionStatus,
  useVerifyEmail,
} from "./hooks/useAuth";
export { CONTENT_MANAGER_ROLES } from "./utils/auth-helpers";
export { setupAuthSession } from "./utils/session";
export type {
  AuthUser,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResendVerificationResponse,
  UserRole,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from "./types/auth.types";
