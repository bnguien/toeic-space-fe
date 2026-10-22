import type { BreakdownRow } from "../ui";
import type { UserStatistics } from "../../types/user-management.types";
import { STATUS_COLORS, STATUS_LABELS } from "../../utils/userManagement";

export const accountStatusRow = (statistics: UserStatistics): BreakdownRow => ({
  key: "accounts",
  title: "Trạng thái tài khoản",
  segments: [
    {
      key: "Active",
      label: STATUS_LABELS.Active,
      value: statistics.active,
      color: STATUS_COLORS.Active,
    },
    {
      key: "Inactive",
      label: STATUS_LABELS.Inactive,
      value: statistics.unverified,
      color: STATUS_COLORS.Inactive,
    },
    {
      key: "Suspended",
      label: STATUS_LABELS.Suspended,
      value: statistics.suspended,
      color: STATUS_COLORS.Suspended,
    },
  ],
});
