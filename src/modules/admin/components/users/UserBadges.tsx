import { useState } from "react";

import type { UserRole } from "@/modules/auth";
import { normalizeAvatarUrl } from "@/modules/profile";
import type { ManagedUserStatus } from "../../types/user-management.types";
import {
  initials,
  ROLE_LABELS,
  ROLE_TONES,
  STATUS_LABELS,
  STATUS_TONES,
} from "../../utils/userManagement";
import { Badge } from "../ui";
import styles from "./users.module.css";

export function UserAvatar({
  name,
  avatarUrl,
  role,
  size = 36,
}: {
  name: string;
  avatarUrl: string | null;
  role?: UserRole;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const source = avatarUrl ? (normalizeAvatarUrl(avatarUrl) ?? avatarUrl) : null;

  return (
    <span
      className={styles.avatar}
      data-role={role}
      style={{ width: size, height: size, fontSize: size > 48 ? 18 : undefined }}
      aria-hidden="true"
    >
      {source && !failed ? (
        <img src={source} alt="" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** Avatar, name and email: the identifying column of every user table and list. */
export function UserCell({
  user,
}: {
  user: { fullName: string; email: string; avatarUrl: string | null; role: UserRole };
}) {
  return (
    <span className={styles.userCell}>
      <UserAvatar name={user.fullName} avatarUrl={user.avatarUrl} role={user.role} />
      <span className={styles.userText}>
        <strong>{user.fullName}</strong>
        <small>{user.email}</small>
      </span>
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>;
}

export function StatusBadge({
  status,
  deleted = false,
}: {
  status: ManagedUserStatus;
  deleted?: boolean;
}) {
  return deleted ? (
    <Badge dot>Đã xoá</Badge>
  ) : (
    <Badge tone={STATUS_TONES[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
