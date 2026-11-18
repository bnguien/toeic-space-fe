import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "../api/sessions.api";
import type { SessionEdit, SessionFilters, SessionInput } from "../types/schedule.types";

export const sessionKeys = {
  all: ["admin", "class-sessions"] as const,
  list: (filters: SessionFilters) => [...sessionKeys.all, filters] as const,
  session: (id: string) => [...sessionKeys.all, id] as const,
  audit: (id: string) => [...sessionKeys.session(id), "audit"] as const,
};

export const meetKeys = {
  status: (id: string) => ["class-session-meet", id] as const,
  link: (id: string) => ["class-session-meet-link", id] as const,
};

export function useClassSessions(filters: SessionFilters) {
  return useQuery({
    queryKey: sessionKeys.list(filters),
    queryFn: ({ signal }) => sessionsApi.list(filters, signal),
    enabled: Boolean(filters.from && filters.to),
  });
}

export function useSessionAudit(sessionId: string | null) {
  return useQuery({
    queryKey: sessionId ? sessionKeys.audit(sessionId) : sessionKeys.all,
    queryFn: ({ signal }) => (sessionId ? sessionsApi.audit(sessionId, signal) : []),
    enabled: Boolean(sessionId),
  });
}

export function useSessionMeet(sessionId: string | null) {
  return useQuery({
    queryKey: meetKeys.status(sessionId ?? "none"),
    queryFn: ({ signal }) => sessionsApi.meetStatus(sessionId!, signal),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: 30_000,
  });
}

export function useRetryMeet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.retryMeet(sessionId),
    onSuccess: (_, sessionId) => {
      void queryClient.invalidateQueries({ queryKey: meetKeys.status(sessionId) });
    },
  });
}

export function useSessionActions(classId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["class-session-meet"] });
    if (classId) {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "class-schedules", "class", classId],
      });
    }
  };

  const create = useMutation({
    mutationFn: (input: SessionInput) => sessionsApi.create(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: SessionEdit }) =>
      sessionsApi.update(id, input),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => sessionsApi.cancel(id, reason),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: (id: string) => sessionsApi.complete(id),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    cancel,
    complete,
  };
}
