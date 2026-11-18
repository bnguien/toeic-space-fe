import { useCurrentUser, useLogout, type UserRole } from "@/modules/auth";
import { AdminLayout } from "@/shared/layouts/AdminLayout";

import { AskAiButton, AssistantChatProvider } from "../assistant";

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

  // One conversation for the header drawer and the assistant page.
  return (
    <AssistantChatProvider>
      <AdminLayout
        account={
          user
            ? {
                name: user.fullName,
                email: user.email,
                roleLabel: ROLE_LABELS[user.role],
                avatarUrl: user.avatarUrl,
              }
            : undefined
        }
        onLogout={() => logout.mutate()}
        loggingOut={logout.isPending}
        headerActions={<AskAiButton />}
      />
    </AssistantChatProvider>
  );
}
