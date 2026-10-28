import { Activity, GraduationCap, List, Users } from "lucide-react";

import studentMascot from "@/assets/mascot/oy2-reading.png";
import teacherMascot from "@/assets/mascot/oy2-teamwork.png";
import { AccountTrendCard } from "../components/users/AccountTrendCard";
import { UserDetailDrawer } from "../components/users/UserDetailDrawer";
import { UserMiniList } from "../components/users/UserMiniList";
import {
  AdminPage,
  ButtonLink,
  Card,
  CardGrid,
  OverviewHero,
  useListParams,
} from "../components/ui";
import { useUserList, useUserStatistics } from "../hooks/useManagedUsers";
import { formatDate, formatRelative } from "../utils/userManagement";

const PAGES = {
  User: {
    noun: "học viên",
    eyebrow: "Học viên",
    icon: <GraduationCap size={15} />,
    description: "Đăng ký, trạng thái và hoạt động của học viên.",
    watermark: "STUDENTS",
    base: "/admin/students",
    mascot: studentMascot,
    theme: "blue",
  },
  Teacher: {
    noun: "giáo viên",
    eyebrow: "Giáo viên",
    icon: <Users size={15} />,
    description: "Đội ngũ giảng dạy và hoạt động gần đây.",
    watermark: "TEACHERS",
    base: "/admin/teachers",
    mascot: teacherMascot,
    theme: "amber",
  },
} as const;

/** One role at a glance: counts in the banner, its activity over time, newest and recent users. */
export function UserOverviewPage({ role }: { role: "User" | "Teacher" }) {
  const page = PAGES[role];
  const list = useListParams();
  const statistics = useUserStatistics(role);
  const newest = useUserList({ role, sort: "Newest", page: 1, pageSize: 6 });
  const recent = useUserList({ role, sort: "LastActive", page: 1, pageSize: 6 });
  const stats = statistics.data;
  const listPath = `${page.base}/list`;

  return (
    <AdminPage
      theme={page.theme}
      hero={
        <OverviewHero
          eyebrow={page.eyebrow}
          icon={page.icon}
          title="Tổng quan"
          highlight={page.noun}
          description={page.description}
          watermark={page.watermark}
          mascot={page.mascot}
          actions={
            <>
              <ButtonLink to={listPath} variant="primary" icon={<List size={15} />}>
                Danh sách
              </ButtonLink>
              <ButtonLink to={`${page.base}/activities`} icon={<Activity size={15} />}>
                Hoạt động
              </ButtonLink>
            </>
          }
          panelLabel="30 ngày qua"
          panelTitle={stats ? `+${stats.createdLast30Days} ${page.noun} mới` : "Đang tải..."}
          stats={[
            { key: "total", label: "Tổng", value: stats?.total, to: listPath },
            {
              key: "active",
              label: "Hoạt động",
              value: stats?.active,
              to: `${listPath}?status=Active`,
            },
            {
              key: "suspended",
              label: "Đã khoá",
              value: stats?.suspended,
              highlight: Boolean(stats?.suspended),
              to: `${listPath}?status=Suspended`,
            },
            {
              key: "unverified",
              label: "Chưa xác thực",
              value: stats?.unverified,
              to: `${listPath}?status=Inactive`,
            },
          ]}
        />
      }
    >
      <AccountTrendCard role={role} title={`Hoạt động ${page.noun}`} />

      <CardGrid>
        <Card
          title="Mới tham gia"
          action={
            <ButtonLink to={listPath} variant="ghost" size="sm">
              Tất cả
            </ButtonLink>
          }
        >
          <UserMiniList
            users={newest.data?.items}
            loading={newest.isPending}
            error={newest.error}
            meta={(user) => formatDate(user.createdAt)}
            onSelect={(user) => list.set("user", user.id)}
          />
        </Card>
        <Card
          title="Hoạt động gần đây"
          action={
            <ButtonLink to={`${page.base}/activities`} variant="ghost" size="sm">
              Tất cả
            </ButtonLink>
          }
        >
          <UserMiniList
            users={recent.data?.items.filter((user) => user.lastActiveAt)}
            loading={recent.isPending}
            error={recent.error}
            meta={(user) => formatRelative(user.lastActiveAt)}
            onSelect={(user) => list.set("user", user.id)}
            empty="Chưa có ai đăng nhập"
          />
        </Card>
      </CardGrid>

      <UserDetailDrawer userId={list.get("user") || null} onClose={() => list.set("user", "")} />
    </AdminPage>
  );
}
