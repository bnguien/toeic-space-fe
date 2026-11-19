import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser, useSessionStatus } from "@/modules/auth";
import {
  practiceSetsApi,
  type PracticeSetContent,
  type PracticeSetDetail,
} from "../api/practice-sets.api";
import { practiceKeys } from "./usePracticeSets";

export const practicePreviewRefreshInterval = 5_000;
type PreviewData = {
  set: PracticeSetDetail | null;
  content: PracticeSetContent | null;
  error: unknown;
};

export function usePracticePreview(id: string) {
  const user = useCurrentUser();
  const status = useSessionStatus();
  const preview = useQuery({
    queryKey: [...practiceKeys.all, "preview", id, status, user?.id, user?.role],
    enabled: Boolean(id) && (status === "authenticated" || status === "anonymous"),
    queryFn: async ({ signal }): Promise<PreviewData> => {
      try {
        const set = await practiceSetsApi.detail(id, signal);
        const content =
          user && set.status === "Active" ? await practiceSetsApi.content(id, signal) : null;
        return { set, content, error: null };
      } catch (error) {
        if (signal.aborted) throw error;
        // Replace the whole cached snapshot: a refetch error must not retain old
        // questions, answers or media after access has been revoked.
        return { set: null, content: null, error };
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    refetchInterval: practicePreviewRefreshInterval,
    refetchIntervalInBackground: false,
    networkMode: "always",
    retry: false,
  });
  const { refetch } = preview;
  useEffect(() => {
    if (!id || (status !== "authenticated" && status !== "anonymous")) return;
    const refresh = () => {
      void refetch();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [id, status, refetch]);
  return preview;
}
