import { LayoutDashboard } from "lucide-react";

import mascot from "@/assets/mascot/oy2-hello.png";
import { useCurrentUser } from "@/modules/auth";
import {
  difficultyRow,
  questionSourceRow,
  questionStatusRow,
} from "../components/exam-bank/bankBreakdown";
import { accountStatusRow } from "../components/users/accountBreakdown";
import { AccountTrendCard } from "../components/users/AccountTrendCard";
import { RoleBadge } from "../components/users/UserBadges";
import { UserDetailDrawer } from "../components/users/UserDetailDrawer";
import { UserMiniList } from "../components/users/UserMiniList";
import {
  AdminPage,
  Breakdown,
  ButtonLink,
  Card,
  CardGrid,
  EmptyState,
  OverviewHero,
  useListParams,
} from "../components/ui";
import { useBankOverview } from "../hooks/useExamBank";
import { useIsAdmin, useUserList, useUserStatistics } from "../hooks/useManagedUsers";
import { apiErrorMessage } from "../utils/apiError";
import { formatRelative } from "../utils/userManagement";

/**
 * Home of the admin area. Only account activity changes over time, so it is the one chart;
 * the rest are counts and share lines. Account figures load for administrators only.
 */
export const AdminDashboardPage = () => {
  const user = useCurrentUser();
  const isAdmin = useIsAdmin();
  const list = useListParams();
  const bank = useBankOverview();
  const all = useUserStatistics();
  const students = useUserStatistics("User");
  const teachers = useUserStatistics("Teacher");
  const newest = useUserList({ sort: "Newest", page: 1, pageSize: 6 });
  const overview = bank.data;
  const today = all.data?.trend.buckets.at(-1);

  return (
    <AdminPage
      hero={
        <OverviewHero
          eyebrow="Bảng điều khiển"
          icon={<LayoutDashboard size={15} />}
          title="Xin chào,"
          highlight={user?.fullName ?? "bạn"}
          description={isAdmin ? "Tài khoản và ngân hàng đề hôm nay." : "Ngân hàng đề hôm nay."}
          watermark="TOEIC"
          mascot={mascot}
          actions={
            <>
              <ButtonLink to="/admin/exams/part-1" variant="primary">
                Duyệt câu hỏi
              </ButtonLink>
              {isAdmin && <ButtonLink to="/admin/system/users">Tài khoản</ButtonLink>}
            </>
          }
          panelLabel="Hôm nay"
          panelTitle={
            isAdmin
              ? today
                ? `${today.activeUsers} người đăng nhập`
                : "Đang tải..."
              : overview
                ? `${overview.activeTests} đề đang sử dụng`
                : "Đang tải..."
          }
          stats={
            isAdmin
              ? [
                  {
                    key: "students",
                    label: "Học viên",
                    value: students.data?.total,
                    to: "/admin/students",
                  },
                  {
                    key: "teachers",
                    label: "Giáo viên",
                    value: teachers.data?.total,
                    to: "/admin/teachers",
                  },
                  {
                    key: "tests",
                    label: "Đề thi",
                    value: overview?.totalTests,
                    to: "/admin/exams/list",
                  },
                  {
                    key: "suspended",
                    label: "Đang khoá",
                    value: all.data?.suspended,
                    highlight: Boolean(all.data?.suspended),
                    to: "/admin/system/users?status=Suspended",
                  },
                ]
              : [
                  {
                    key: "tests",
                    label: "Đề thi",
                    value: overview?.totalTests,
                    to: "/admin/exams/list",
                  },
                  {
                    key: "questions",
                    label: "Câu hỏi",
                    value: overview?.totalQuestions,
                    to: "/admin/exams",
                  },
                  {
                    key: "sets",
                    label: "Bộ luyện tập",
                    value: overview?.totalPracticeSets,
                    highlight: true,
                  },
                ]
          }
        />
      }
    >
      {isAdmin && <AccountTrendCard title="Hoạt động tài khoản" />}

      {bank.isError && (
        <EmptyState
          framed
          title="Chưa tải được ngân hàng đề"
          description={apiErrorMessage(bank.error)}
        />
      )}

      <CardGrid layout={isAdmin ? "wide-left" : undefined}>
        {isAdmin && (
          <Card
            title="Mới tham gia"
            action={
              <ButtonLink to="/admin/system/users" variant="ghost" size="sm">
                Tất cả
              </ButtonLink>
            }
          >
            <UserMiniList
              users={newest.data?.items}
              loading={newest.isPending}
              error={newest.error}
              meta={(account) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <RoleBadge role={account.role} />
                  {formatRelative(account.createdAt)}
                </span>
              )}
              onSelect={(account) => list.set("user", account.id)}
            />
          </Card>
        )}
        <Card title="Phân bổ" span={isAdmin ? undefined : "full"}>
          {overview ? (
            <Breakdown
              rows={[
                ...(isAdmin && all.data ? [accountStatusRow(all.data)] : []),
                questionSourceRow(overview),
                difficultyRow(overview),
                ...(isAdmin ? [] : [questionStatusRow(overview)]),
              ]}
            />
          ) : (
            <EmptyState title="Đang tải..." image={false} />
          )}
        </Card>
      </CardGrid>

      {isAdmin && (
        <UserDetailDrawer userId={list.get("user") || null} onClose={() => list.set("user", "")} />
      )}
    </AdminPage>
  );
};
