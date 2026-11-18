import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulesApi } from "../api/schedules.api";
import type {
  CancelRangeRequest,
  GenerateSessionsInput,
  ScheduleInput,
} from "../types/schedule.types";

export const scheduleKeys = {
  all: ["admin", "class-schedules"] as const,
  classSchedules: (classId: string) => [...scheduleKeys.all, "class", classId] as const,
  schedule: (classId: string, id: string) => [...scheduleKeys.classSchedules(classId), id] as const,
  audit: (classId: string, id: string) => [...scheduleKeys.schedule(classId, id), "audit"] as const,
};

export function useClassSchedules(classId: string) {
  return useQuery({
    queryKey: scheduleKeys.classSchedules(classId),
    queryFn: ({ signal }) => schedulesApi.list(classId, signal),
    enabled: Boolean(classId),
  });
}

export function useScheduleAudit(classId: string, scheduleId: string | null) {
  return useQuery({
    queryKey: scheduleId ? scheduleKeys.audit(classId, scheduleId) : scheduleKeys.all,
    queryFn: ({ signal }) => (scheduleId ? schedulesApi.audit(classId, scheduleId, signal) : []),
    enabled: Boolean(classId && scheduleId),
  });
}

export function useScheduleActions(classId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: scheduleKeys.classSchedules(classId) });
    // Generating or cancelling sessions from schedules affects class-sessions
    void queryClient.invalidateQueries({ queryKey: ["admin", "class-sessions"] });
  };

  const create = useMutation({
    mutationFn: (input: ScheduleInput) => schedulesApi.create(classId, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
      expectedVersion,
    }: {
      id: string;
      input: ScheduleInput;
      expectedVersion: number;
    }) => schedulesApi.update(classId, id, input, expectedVersion),
    onSuccess: invalidate,
  });

  const generate = useMutation({
    mutationFn: (payload: GenerateSessionsInput) => schedulesApi.generate(classId, payload),
    onSuccess: invalidate,
  });

  const bulkCancel = useMutation({
    mutationFn: (payload: CancelRangeRequest) => schedulesApi.bulkCancel(classId, payload),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    generate,
    bulkCancel,
  };
}
