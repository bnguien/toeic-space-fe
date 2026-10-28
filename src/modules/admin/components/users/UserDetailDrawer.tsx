import { useState } from "react";
import { Lock, LogOut, Pencil, RotateCcw, Trash2, Unlock } from "lucide-react";

import { useCurrentUser, type UserRole } from "@/modules/auth";
import { Select } from "@/shared/components/Select";
import {
  useChangeUserRole,
  useChangeUserStatus,
  useDeleteUser,
  useRestoreUser,
  useRevokeUserSessions,
  useUpdateUser,
  useUserDetail,
} from "../../hooks/useManagedUsers";
import type { ManagedUserDetail } from "../../types/user-management.types";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  GENDER_LABELS,
  LEVEL_LABELS,
  ROLE_LABELS,
  userErrorMessage,
} from "../../utils/userManagement";
import { Button, ConfirmDialog, Drawer, DrawerSection, EmptyState, Facts, Highlights } from "../ui";
import { RoleBadge, StatusBadge, UserAvatar } from "./UserBadges";
import { UserFormDialog } from "./UserFormDialog";
import styles from "./users.module.css";

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

/** Opens over any list that shows users; `userId` null keeps it closed. */
export function UserDetailDrawer({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const detail = useUserDetail(userId);
  const user = detail.data;

  return (
    <Drawer
      open={Boolean(userId)}
      title={user?.fullName ?? "Tài khoản"}
      subtitle={user?.email}
      leading={
        user && (
          <UserAvatar name={user.fullName} avatarUrl={user.avatarUrl} role={user.role} size={52} />
        )
      }
      meta={
        user && (
          <>
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} deleted={Boolean(user.deletedAt)} />
          </>
        )
      }
      onClose={onClose}
    >
      {detail.isPending ? (
        <EmptyState title="Đang tải..." image={false} />
      ) : detail.isError ? (
        <EmptyState
          title="Không mở được tài khoản"
          description={userErrorMessage(detail.error)}
          action={
            <Button size="sm" onClick={() => void detail.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : (
        // Keyed so the role picker resets when another account opens.
        <UserDetailContent key={detail.data.id} user={detail.data} />
      )}
    </Drawer>
  );
}

type PendingAction = "role" | "suspend" | "activate" | "revoke" | "delete" | "restore" | null;

function UserDetailContent({ user }: { user: ManagedUserDetail }) {
  const currentUser = useCurrentUser();
  const isSelf = currentUser?.id === user.id;
  const isDeleted = Boolean(user.deletedAt);
  const isVerified = Boolean(user.emailVerifiedAt);
  const locked = isSelf || isDeleted;

  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [nextRole, setNextRole] = useState<UserRole>(user.role);

  const updateUser = useUpdateUser(user.id);
  const changeRole = useChangeUserRole(user.id);
  const changeStatus = useChangeUserStatus(user.id);
  const revokeSessions = useRevokeUserSessions(user.id);
  const deleteUser = useDeleteUser(user.id);
  const restoreUser = useRestoreUser();

  const open = (action: PendingAction) => {
    [changeRole, changeStatus, revokeSessions, deleteUser, restoreUser].forEach((mutation) =>
      mutation.reset(),
    );
    setPending(action);
  };
  const close = () => setPending(null);
  const errorOf = (error: unknown) => (error ? userErrorMessage(error) : null);

  const profile = [
    { label: "Ngày sinh", value: user.dateOfBirth && formatDate(user.dateOfBirth) },
    { label: "Giới tính", value: user.gender && GENDER_LABELS[user.gender] },
    { label: "Trình độ", value: user.currentLevel && LEVEL_LABELS[user.currentLevel] },
    { label: "Mục tiêu TOEIC", value: user.targetScore },
    { label: "Giới thiệu", value: user.biography, wide: true },
  ].filter((item) => item.value);

  return (
    <>
      {isSelf && <p className={styles.notice}>Đây là tài khoản của bạn.</p>}
      {isDeleted && <p className={styles.notice}>Đang ở thùng rác. Khôi phục để chỉnh sửa.</p>}

      <Highlights
        items={[
          {
            label: "Hoạt động gần nhất",
            value: (
              <span title={formatDateTime(user.lastActiveAt)}>
                {formatRelative(user.lastActiveAt)}
              </span>
            ),
            accent: Boolean(user.lastActiveAt),
          },
          {
            label: "Đang đăng nhập",
            value: `${user.activeSessionCount} thiết bị`,
            accent: user.activeSessionCount > 0,
          },
          { label: "Tham gia", value: formatDate(user.createdAt) },
        ]}
      />

      <DrawerSection title="Tài khoản">
        <Facts
          items={[
            { label: "Email", value: user.email },
            { label: "Số điện thoại", value: user.phone ?? "—" },
            {
              label: "Xác thực email",
              value: isVerified ? formatDateTime(user.emailVerifiedAt) : "Chưa xác thực",
            },
            { label: "Ngày tạo", value: formatDateTime(user.createdAt) },
            ...(isDeleted ? [{ label: "Ngày xoá", value: formatDateTime(user.deletedAt) }] : []),
          ]}
        />
      </DrawerSection>

      {profile.length > 0 && (
        <DrawerSection title="Hồ sơ học tập">
          <Facts items={profile} />
        </DrawerSection>
      )}

      {!locked && (
        <DrawerSection title="Vai trò">
          <div className={styles.inline}>
            <Select
              aria-label="Vai trò mới"
              value={nextRole}
              options={ROLE_OPTIONS}
              onChange={(role) => setNextRole(role as UserRole)}
            />
            <Button
              variant="primary"
              disabled={nextRole === user.role}
              onClick={() => open("role")}
            >
              Cập nhật
            </Button>
          </div>
        </DrawerSection>
      )}

      <DrawerSection title="Thao tác">
        <div className={styles.actions}>
          {isDeleted ? (
            <Button
              variant="primary"
              icon={<RotateCcw size={16} />}
              onClick={() => open("restore")}
            >
              Khôi phục
            </Button>
          ) : (
            <>
              <Button
                icon={<Pencil size={16} />}
                onClick={() => {
                  updateUser.reset();
                  setEditing(true);
                }}
              >
                Sửa
              </Button>
              <Button
                icon={<LogOut size={16} />}
                disabled={isSelf || user.activeSessionCount === 0}
                title={user.activeSessionCount === 0 ? "Không có phiên đang mở" : undefined}
                onClick={() => open("revoke")}
              >
                Đăng xuất thiết bị
              </Button>
              {user.status === "Suspended" ? (
                <Button
                  icon={<Unlock size={16} />}
                  disabled={isSelf}
                  onClick={() => open("activate")}
                >
                  Mở khoá
                </Button>
              ) : (
                <Button
                  variant="danger-outline"
                  icon={<Lock size={16} />}
                  disabled={isSelf || !isVerified}
                  title={isVerified ? undefined : "Tài khoản chưa xác thực email"}
                  onClick={() => open("suspend")}
                >
                  Khoá
                </Button>
              )}
              <Button
                variant="danger-outline"
                icon={<Trash2 size={16} />}
                disabled={isSelf}
                onClick={() => open("delete")}
              >
                Xoá
              </Button>
            </>
          )}
        </div>
      </DrawerSection>

      {editing && (
        <UserFormDialog
          mode="edit"
          initial={{
            fullName: user.fullName,
            email: user.email,
            phone: user.phone ?? "",
            role: user.role,
          }}
          pending={updateUser.isPending}
          error={updateUser.error}
          onClose={() => setEditing(false)}
          onSubmit={({ fullName, phone }) =>
            updateUser.mutate({ fullName, phone }, { onSuccess: () => setEditing(false) })
          }
        />
      )}

      <ConfirmDialog
        open={pending === "role"}
        title="Đổi vai trò"
        description={
          <>
            {ROLE_LABELS[user.role]} → <strong>{ROLE_LABELS[nextRole]}</strong>. Người dùng sẽ phải
            đăng nhập lại.
          </>
        }
        confirmLabel="Đổi vai trò"
        pending={changeRole.isPending}
        error={errorOf(changeRole.error)}
        onClose={close}
        onConfirm={() => changeRole.mutate(nextRole, { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "suspend"}
        title="Khoá tài khoản"
        tone="danger"
        description="Người dùng bị đăng xuất và không đăng nhập được cho tới khi mở khoá."
        confirmLabel="Khoá"
        pending={changeStatus.isPending}
        error={errorOf(changeStatus.error)}
        onClose={close}
        onConfirm={() => changeStatus.mutate("Suspended", { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "activate"}
        title="Mở khoá tài khoản"
        description="Người dùng đăng nhập lại được bằng mật khẩu hiện tại."
        confirmLabel="Mở khoá"
        pending={changeStatus.isPending}
        error={errorOf(changeStatus.error)}
        onClose={close}
        onConfirm={() => changeStatus.mutate("Active", { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "revoke"}
        title="Đăng xuất mọi thiết bị"
        description={`Kết thúc ${user.activeSessionCount} phiên đang mở.`}
        confirmLabel="Đăng xuất"
        pending={revokeSessions.isPending}
        error={errorOf(revokeSessions.error)}
        onClose={close}
        onConfirm={() => revokeSessions.mutate(undefined, { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "delete"}
        title="Xoá tài khoản"
        tone="danger"
        description="Chuyển vào thùng rác. Có thể khôi phục lại sau."
        confirmLabel="Xoá"
        pending={deleteUser.isPending}
        error={errorOf(deleteUser.error)}
        onClose={close}
        onConfirm={() => deleteUser.mutate(undefined, { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "restore"}
        title="Khôi phục tài khoản"
        description="Giữ nguyên vai trò và trạng thái trước khi xoá."
        confirmLabel="Khôi phục"
        pending={restoreUser.isPending}
        error={errorOf(restoreUser.error)}
        onClose={close}
        onConfirm={() => restoreUser.mutate(user.id, { onSuccess: close })}
      />
    </>
  );
}
