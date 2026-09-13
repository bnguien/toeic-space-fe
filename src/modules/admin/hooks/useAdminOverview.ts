import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api/admin.api";
import { adminKeys } from "../api/admin.query-keys";

export const useAdminOverview = () => {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: adminApi.getOverview,
    staleTime: 60 * 1000,
  });
};
