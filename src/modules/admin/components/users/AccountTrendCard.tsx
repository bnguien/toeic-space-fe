import type { ReactNode } from "react";

import type { UserRole } from "@/modules/auth";
import { useUserStatistics } from "../../hooks/useManagedUsers";
import type { UserStatistics } from "../../types/user-management.types";
import { userErrorMessage } from "../../utils/userManagement";
import {
  Card,
  EmptyState,
  TimeRangeFilter,
  TrendChart,
  TrendLegend,
  timeRangeInfo,
  useTimeRange,
} from "../ui";
import styles from "./users.module.css";

type Trend = UserStatistics["trend"];

const pad = (value: number) => String(value).padStart(2, "0");

/** Bucket starts come in the viewer's local time without an offset. */
function bucketLabels(trend: Trend) {
  const dates = trend.buckets.map((bucket) => new Date(bucket.start));
  const day = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  const hour = (date: Date) => `${pad(date.getHours())}:00`;

  if (trend.bucket === "hour") {
    return {
      // A new day is labelled with its date instead of the hour.
      labels: dates.map((date) =>
        date.getHours() === 0 || trend.bucketHours > 1 ? `${day(date)} ${hour(date)}` : hour(date),
      ),
      tooltips: dates.map((date) => `${day(date)} ${hour(date)}`),
    };
  }
  if (trend.bucketHours > 24) {
    return {
      labels: dates.map(day),
      tooltips: dates.map((date) => {
        const end = new Date(date.getTime() + (trend.bucketHours - 24) * 3600_000);
        return `${day(date)} – ${day(end)}`;
      }),
    };
  }
  return { labels: dates.map(day), tooltips: dates.map(day) };
}

/**
 * New accounts and signed-in users of a role over the chosen range, with the change against
 * the period before. The same card serves the dashboard and every user overview.
 */
export function AccountTrendCard({
  role,
  title,
  action,
}: {
  role?: UserRole;
  title: string;
  action?: ReactNode;
}) {
  const [range, setRange] = useTimeRange();
  const statistics = useUserStatistics(role, range);
  const trend = statistics.data?.trend;
  const previousLabel = timeRangeInfo(range).previous;

  return (
    <Card title={title} action={<TimeRangeFilter value={range} onChange={setRange} />} span="full">
      {statistics.isError ? (
        <EmptyState
          title="Chưa tải được"
          description={userErrorMessage(statistics.error)}
          image={false}
        />
      ) : !trend ? (
        <EmptyState title="Đang tải..." image={false} />
      ) : (
        <div className={styles.trend} aria-busy={statistics.isFetching}>
          <TrendLegend
            previousLabel={previousLabel}
            items={[
              {
                key: "registrations",
                label: "Tài khoản mới",
                color: "var(--theme-strong)",
                total: trend.registrations,
                previous: trend.previousRegistrations,
              },
              {
                key: "active",
                label: "Người đăng nhập",
                color: "var(--theme-mid)",
                total: trend.activeUsers,
                previous: trend.previousActiveUsers,
                dashed: true,
              },
            ]}
          />
          <TrendChart
            label={`${title} trong ${timeRangeInfo(range).label}`}
            unit="người"
            {...bucketLabels(trend)}
            series={[
              {
                key: "registrations",
                label: "Tài khoản mới",
                color: "var(--theme-strong)",
                values: trend.buckets.map((bucket) => bucket.registrations),
              },
              {
                key: "active",
                label: "Người đăng nhập",
                color: "var(--theme-mid)",
                values: trend.buckets.map((bucket) => bucket.activeUsers),
                dashed: true,
              },
            ]}
          />
          {action}
        </div>
      )}
    </Card>
  );
}
