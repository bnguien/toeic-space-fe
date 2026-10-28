import { usersApi } from "../../api/users.api";
import type { ManagedUser, UserListFilters } from "../../types/user-management.types";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  ROLE_LABELS,
  STATUS_LABELS,
} from "../../utils/userManagement";
import { collectPages, downloadCsv, type Column } from "../ui";
import uiStyles from "../ui/ui.module.css";
import { RoleBadge, StatusBadge, UserCell } from "./UserBadges";

interface ColumnOptions {
  showRole: boolean;
  trash: boolean;
  /** Activity pages lead with the last activity and hide the creation date. */
  activity?: boolean;
}

/** Columns of every user table; the less important ones start hidden. */
export function userColumns({
  showRole,
  trash,
  activity = false,
}: ColumnOptions): Column<ManagedUser>[] {
  const columns: (Column<ManagedUser> | false)[] = [
    { key: "user", header: "Người dùng", locked: true, render: (user) => <UserCell user={user} /> },
    showRole && {
      key: "role",
      header: "Vai trò",
      nowrap: true,
      render: (user) => <RoleBadge role={user.role} />,
    },
    {
      key: "status",
      header: "Trạng thái",
      nowrap: true,
      render: (user) => <StatusBadge status={user.status} deleted={Boolean(user.deletedAt)} />,
    },
    {
      key: "lastActive",
      header: "Hoạt động gần nhất",
      nowrap: true,
      render: (user) => (
        <span
          className={user.lastActiveAt ? undefined : uiStyles.muted}
          title={user.lastActiveAt ? formatDateTime(user.lastActiveAt) : undefined}
        >
          {formatRelative(user.lastActiveAt)}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      nowrap: true,
      defaultHidden: true,
      render: (user) => user.phone ?? <span className={uiStyles.muted}>—</span>,
    },
    {
      key: "verified",
      header: "Xác thực email",
      nowrap: true,
      defaultHidden: true,
      render: (user) =>
        user.emailVerified ? "Đã xác thực" : <span className={uiStyles.muted}>Chưa</span>,
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      nowrap: true,
      defaultHidden: activity,
      render: (user) => formatDate(user.createdAt),
    },
    trash && {
      key: "deletedAt",
      header: "Ngày xoá",
      nowrap: true,
      render: (user) => formatDate(user.deletedAt),
    },
  ];

  return columns.filter((column): column is Column<ManagedUser> => Boolean(column));
}

const EXPORT_LIMIT = 5000;

/** Exports every account matching the filters, not only the visible page. */
export async function exportUsers(filters: UserListFilters, fileName: string) {
  const { rows, truncated } = await collectPages(
    (page) => usersApi.list({ ...filters, page, pageSize: 100 }),
    EXPORT_LIMIT,
  );

  downloadCsv(
    fileName,
    [
      { header: "Họ và tên", value: (user) => user.fullName },
      { header: "Email", value: (user) => user.email },
      { header: "Số điện thoại", value: (user) => user.phone },
      { header: "Vai trò", value: (user) => ROLE_LABELS[user.role] },
      {
        header: "Trạng thái",
        value: (user) => (user.deletedAt ? "Đã xoá" : STATUS_LABELS[user.status]),
      },
      { header: "Xác thực email", value: (user) => (user.emailVerified ? "Có" : "Chưa") },
      { header: "Ngày tạo", value: (user) => formatDateTime(user.createdAt) },
      {
        header: "Hoạt động gần nhất",
        value: (user) => (user.lastActiveAt ? formatDateTime(user.lastActiveAt) : ""),
      },
      {
        header: "Ngày xoá",
        value: (user) => (user.deletedAt ? formatDateTime(user.deletedAt) : ""),
      },
    ],
    rows,
  );

  return { count: rows.length, truncated };
}
