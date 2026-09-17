import { useCurrentUser, useLogout, type UserRole } from "@/modules/auth";
import { AdminLayout } from "@/shared/layouts/AdminLayout";

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: "Quản trị viên",
  Teacher: "Giáo viên",
  User: "Học viên",
};

/**
 * Admin layout bound to the signed-in account.
 */
export function AdminShell() {
  const user = useCurrentUser();
  const logout = useLogout();

  return (
    <AdminLayout
      account={
        user
          ? { name: user.fullName, email: user.email, roleLabel: ROLE_LABELS[user.role] }
          : undefined
      }
      onLogout={() => logout.mutate()}
      loggingOut={logout.isPending}
    />
  );
}
