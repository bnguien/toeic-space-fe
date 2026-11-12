import { useCallback, useMemo, useState } from "react";
import { Download, RefreshCw, RotateCcw, UserPlus, Users } from "lucide-react";

import searchMascot from "@/assets/mascot/oy2-search.png";
import proudMascot from "@/assets/mascot/oy2-proud.png";

import type { UserRole } from "@/modules/auth";
import { TemporaryPasswordDialog } from "../components/users/TemporaryPasswordDialog";
import { UserDetailDrawer } from "../components/users/UserDetailDrawer";
import { UserFormDialog } from "../components/users/UserFormDialog";
import { exportUsers, userColumns } from "../components/users/userTable";
import {
  AdminPage,
  Button,
  ConfirmDialog,
  DataTable,
  DataToolbar,
  ListHero,
  Segmented,
  useListParams,
  type Column,
  type FilterField,
} from "../components/ui";
import {
  useCreateUser,
  useRestoreUser,
  useUserList,
  useUserStatistics,
} from "../hooks/useManagedUsers";
import type {
  CreateUserResponse,
  ManagedUser,
  ManagedUserSort,
  ManagedUserStatus,
  UserListFilters,
} from "../types/user-management.types";
import { ROLE_LABELS, STATUS_LABELS, userErrorMessage } from "../utils/userManagement";

const PAGE_SIZE = 20;

type Scope = UserRole | "All";

const TITLES: Record<Scope, { list: string; activity: string; noun: string }> = {
  User: { list: "Học viên", activity: "Hoạt động học viên", noun: "học viên" },
  Teacher: { list: "Giáo viên", activity: "Hoạt động giáo viên", noun: "giáo viên" },
  Admin: { list: "Quản trị viên", activity: "Hoạt động quản trị viên", noun: "quản trị viên" },
  All: { list: "Tất cả tài khoản", activity: "Hoạt động", noun: "tài khoản" },
};

const SORT_LABELS: Record<ManagedUserSort, string> = {
  Newest: "Mới tạo trước",
  Oldest: "Cũ nhất trước",
  Name: "Tên A–Z",
  LastActive: "Hoạt động gần nhất",
};

const options = <T extends string>(labels: Record<T, string>, all: string) => [
  { value: "", label: all },
  ...(Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] })),
];

const isOneOf = <T extends string>(labels: Record<T, string>, value: string): value is T =>
  value in labels;

interface UserListPageProps {
  /** Fixes the list to one role; without it every account is listed with a role filter. */
  role?: UserRole;
  /** "activity" sorts by the last sign-in and hides the trash. */
  mode?: "list" | "activity";
}

export function UserListPage({ role, mode = "list" }: UserListPageProps) {
  const scope: Scope = role ?? "All";
  const theme = role === "Teacher" ? "amber" : "blue";
  const activity = mode === "activity";
  const mainPage = !activity && (role === "User" || role === "Teacher");
  const titles = TITLES[scope];
  const list = useListParams();
  const trash = !activity && list.get("tab") === "deleted";
  const defaultSort: ManagedUserSort = activity ? "LastActive" : "Newest";

  const status = list.get("status");
  const roleFilter = list.get("role");
  const sort = list.get("sort");

  const filters: UserListFilters = {
    search: list.get("search") || undefined,
    role: role ?? (isOneOf(ROLE_LABELS, roleFilter) ? roleFilter : undefined),
    status: !trash && isOneOf(STATUS_LABELS, status) ? (status as ManagedUserStatus) : undefined,
    deleted: trash || undefined,
    sort: isOneOf(SORT_LABELS, sort) ? sort : defaultSort,
    page: list.page,
    pageSize: PAGE_SIZE,
  };

  const users = useUserList(filters);
  const statistics = useUserStatistics(role);
  const createUser = useCreateUser();
  const restoreUser = useRestoreUser();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateUserResponse | null>(null);
  const [restoring, setRestoring] = useState<ManagedUser | null>(null);
  const [exporting, setExporting] = useState(false);
  const stats = statistics.data;

  const { set: setParam } = list;
  const onSearch = useCallback((value: string) => setParam("search", value), [setParam]);

  const filterFields: FilterField[] = [
    ...(!role
      ? [
          {
            key: "role",
            label: "Vai trò",
            value: roleFilter,
            options: options(ROLE_LABELS, "Mọi vai trò"),
          },
        ]
      : []),
    ...(!trash
      ? [
          {
            key: "status",
            label: "Trạng thái",
            value: status,
            options: options(STATUS_LABELS, "Mọi trạng thái"),
          },
        ]
      : []),
    {
      key: "sort",
      label: "Sắp xếp",
      // The default order is not an active filter, so it shows no chip.
      value: sort && sort !== defaultSort ? sort : "",
      options: [
        { value: "", label: SORT_LABELS[defaultSort] },
        ...(Object.keys(SORT_LABELS) as ManagedUserSort[])
          .filter((value) => value !== defaultSort)
          .map((value) => ({ value, label: SORT_LABELS[value] })),
      ],
    },
  ];

  const columns = useMemo(() => {
    const base = userColumns({ showRole: !role, trash, activity });
    if (!trash) return base;
    const restore: Column<ManagedUser> = {
      key: "restore",
      header: "Khôi phục",
      locked: true,
      align: "right",
      render: (user) => (
        <Button
          size="sm"
          icon={<RotateCcw size={14} />}
          onClick={(event) => {
            event.stopPropagation();
            restoreUser.reset();
            setRestoring(user);
          }}
        >
          Khôi phục
        </Button>
      ),
    };
    return [...base, restore];
  }, [role, trash, activity, restoreUser]);

  const runExport = async () => {
    setExporting(true);
    try {
      const result = await exportUsers(
        { ...filters, page: 1, pageSize: 100 },
        `tai-khoan-${scope.toLowerCase()}${trash ? "-da-xoa" : ""}`,
      );
      if (result.truncated) {
        window.alert(`Chỉ xuất ${result.count.toLocaleString("vi-VN")} dòng đầu. Hãy lọc hẹp hơn.`);
      }
    } catch (error) {
      window.alert(userErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  /** Summary items double as quick filters. */
  const showStatus = (value: ManagedUserStatus | "", extra: Record<string, string> = {}) =>
    list.update({ tab: "", status: value, ...extra });

  const createButton = !activity && (
    <Button
      variant={mainPage ? "default" : "primary"}
      icon={<UserPlus size={17} />}
      onClick={() => {
        createUser.reset();
        setCreating(true);
      }}
    >
      Tạo tài khoản
    </Button>
  );

  const content = (
    <>
      <DataToolbar
        search={list.get("search")}
        onSearch={onSearch}
        placeholder="Tìm tên, email, số điện thoại"
        filters={filterFields}
        onFilterChange={(key, value) => list.set(key, value)}
        onClearFilters={() => list.clear(trash ? ["tab"] : [])}
        leading={
          !activity && (
            <Segmented
              label="Danh sách"
              value={trash ? "deleted" : "current"}
              options={[
                { value: "current", label: "Đang dùng", count: stats?.total },
                { value: "deleted", label: "Thùng rác", count: stats?.deleted },
              ]}
              onChange={(value) =>
                list.update({ status: "", tab: value === "deleted" ? "deleted" : "" })
              }
            />
          )
        }
        actions={[
          {
            key: "export",
            label: exporting ? "Đang xuất..." : "Xuất CSV",
            icon: <Download size={16} />,
            disabled: exporting,
            onSelect: () => void runExport(),
          },
          {
            key: "refresh",
            label: "Làm mới",
            icon: <RefreshCw size={16} />,
            onSelect: () => {
              void users.refetch();
              void statistics.refetch();
            },
          },
        ]}
      />

      <DataTable
        id={`users-${scope}-${mode}-${trash ? "trash" : "current"}`}
        label={titles.list}
        columns={columns}
        rows={users.data?.items}
        getRowId={(user) => user.id}
        onRowClick={(user) => list.set("user", user.id)}
        activeRowId={list.get("user")}
        loading={users.isPending}
        fetching={users.isFetching}
        error={users.isError ? userErrorMessage(users.error) : undefined}
        onRetry={() => void users.refetch()}
        emptyTitle={trash ? "Thùng rác trống" : `Không có ${titles.noun} phù hợp`}
        emptyDescription={
          filters.search || filters.status ? "Thử đổi từ khoá hoặc bỏ bớt bộ lọc." : undefined
        }
        pagination={
          users.data && {
            page: filters.page,
            pages: users.data.totalPages,
            total: users.data.totalCount,
            pageSize: PAGE_SIZE,
            onChange: (page) => list.set("page", String(page)),
          }
        }
      />

      <UserDetailDrawer userId={list.get("user") || null} onClose={() => list.set("user", "")} />

      {creating && (
        <UserFormDialog
          mode="create"
          initial={{ fullName: "", email: "", phone: "", role: role ?? "User" }}
          pending={createUser.isPending}
          error={createUser.error}
          onClose={() => setCreating(false)}
          onSubmit={(values) =>
            createUser.mutate(values, {
              onSuccess: (result) => {
                setCreating(false);
                setCreated(result);
              },
            })
          }
        />
      )}

      {created && (
        <TemporaryPasswordDialog
          email={created.user.email}
          password={created.temporaryPassword}
          onClose={() => {
            const id = created.user.id;
            setCreated(null);
            list.set("user", id);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(restoring)}
        title="Khôi phục tài khoản"
        description={
          restoring && (
            <>
              Khôi phục <strong>{restoring.fullName}</strong>?
            </>
          )
        }
        confirmLabel="Khôi phục"
        pending={restoreUser.isPending}
        error={restoreUser.error ? userErrorMessage(restoreUser.error) : null}
        onClose={() => setRestoring(null)}
        onConfirm={() =>
          restoring && restoreUser.mutate(restoring.id, { onSuccess: () => setRestoring(null) })
        }
      />
    </>
  );

  // Only the student and teacher lists are main pages with a banner.
  return mainPage ? (
    <AdminPage
      theme={theme}
      hero={
        <ListHero
          eyebrow="Quản lý người dùng"
          icon={<Users size={14} />}
          title="Danh sách"
          highlight={titles.noun}
          description={`Tìm, lọc và quản lý tài khoản ${titles.noun}.`}
          mascot={role === "Teacher" ? proudMascot : searchMascot}
          actions={createButton}
          items={[
            {
              key: "all",
              label: "Tất cả",
              value: stats?.total,
              active: !trash && !filters.status,
              onSelect: () => showStatus(""),
            },
            { key: "new", label: "Mới 30 ngày", value: stats?.createdLast30Days },
            {
              key: "suspended",
              label: "Đã khoá",
              value: stats?.suspended,
              active: filters.status === "Suspended",
              onSelect: () => showStatus("Suspended"),
            },
          ]}
        />
      }
    >
      {content}
    </AdminPage>
  ) : (
    <AdminPage
      theme={theme}
      eyebrow="Quản lý người dùng"
      title={activity ? titles.activity : titles.list}
      actions={createButton}
    >
      {content}
    </AdminPage>
  );
}
