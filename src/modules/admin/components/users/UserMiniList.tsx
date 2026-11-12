import type { ReactNode } from "react";

import type { ManagedUser } from "../../types/user-management.types";
import { userErrorMessage } from "../../utils/userManagement";
import { EmptyState } from "../ui";
import uiStyles from "../ui/ui.module.css";
import { UserAvatar } from "./UserBadges";

/** Short clickable list of accounts for overview cards. */
export function UserMiniList({
  users,
  loading,
  error,
  meta,
  onSelect,
  empty = "Chưa có dữ liệu",
}: {
  users: ManagedUser[] | undefined;
  loading: boolean;
  error: unknown;
  meta: (user: ManagedUser) => ReactNode;
  onSelect: (user: ManagedUser) => void;
  empty?: string;
}) {
  if (error) {
    return <EmptyState title="Chưa tải được" description={userErrorMessage(error)} image={false} />;
  }
  if (loading || !users) {
    return (
      <div className={uiStyles.list} aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={uiStyles.listRow}>
            <span className={uiStyles.skeleton} style={{ width: "100%" }} />
          </div>
        ))}
      </div>
    );
  }
  if (users.length === 0) {
    return <EmptyState title={empty} image={false} />;
  }

  return (
    <div className={uiStyles.list}>
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          className={uiStyles.listRow}
          onClick={() => onSelect(user)}
        >
          <UserAvatar name={user.fullName} avatarUrl={user.avatarUrl} role={user.role} size={34} />
          <span className={uiStyles.listMain}>
            <strong>{user.fullName}</strong>
            <small>{user.email}</small>
          </span>
          <span className={uiStyles.listMeta}>{meta(user)}</span>
        </button>
      ))}
    </div>
  );
}
