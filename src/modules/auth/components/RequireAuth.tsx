import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/auth.store";
import type { UserRole } from "../types/auth.types";
import { restoreSession } from "../utils/session";
import { SessionScreen } from "./SessionScreen";

interface RequireAuthProps {
  roles?: readonly UserRole[];
  children: ReactNode;
}

/**
 * Renders children only for a signed-in user with an allowed role.
 * This is a UX guard; the API enforces the same rules on every request.
 */
export function RequireAuth({ roles, children }: RequireAuthProps) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  useEffect(() => {
    void restoreSession();
  }, []);

  if (status === "idle" || status === "restoring") {
    return <SessionScreen variant="loading" />;
  }

  if (status === "anonymous" || !user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <SessionScreen variant="forbidden" />;
  }

  return children;
}
