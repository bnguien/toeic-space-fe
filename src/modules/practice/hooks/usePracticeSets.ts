import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser, useSessionStatus } from "@/modules/auth";
import { practiceSetsApi, type PracticeFilters } from "../api/practice-sets.api";

export const practiceKeys = {
  all: ["practice-sets"] as const,
  detail: (id: string) => ["practice-sets", "detail", id] as const,
};
export function usePracticeSets(filters: PracticeFilters) {
  const status = useSessionStatus();
  const user = useCurrentUser();
  return useQuery({
    queryKey: [...practiceKeys.all, "list", status, user?.id, user?.role, filters],
    enabled: status === "authenticated" || status === "anonymous",
    queryFn: ({ signal }) => practiceSetsApi.list(filters, signal),
  });
}
export function usePracticeSet(id?: string) {
  const status = useSessionStatus();
  const user = useCurrentUser();
  return useQuery({
    queryKey: [...practiceKeys.detail(id ?? ""), status, user?.id, user?.role],
    enabled: Boolean(id) && (status === "authenticated" || status === "anonymous"),
    queryFn: ({ signal }) => practiceSetsApi.detail(id!, signal),
    retry: false,
  });
}
export function usePracticeMutation<T, TResult>(mutationFn: (data: T) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    // Cancel older detail/content requests before writing so a delayed response cannot restore
    // a pre-save order. The post-commit invalidation fetches the latest committed state.
    onMutate: () => client.cancelQueries({ queryKey: practiceKeys.all }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: practiceKeys.all });
    },
  });
}
