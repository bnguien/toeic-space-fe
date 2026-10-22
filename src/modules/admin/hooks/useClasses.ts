import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesApi } from "../api/classes.api";
import { classKeys } from "../api/classes.query-keys";
import type {
  ClassFilters,
  ClassStatus,
  CreateClassPayload,
  UpdateClassPayload,
} from "../types/class.types";

export const useClasses = (filters: ClassFilters, mine: boolean) =>
  useQuery({
    queryKey: mine ? classKeys.mine(filters.page) : classKeys.list(filters),
    queryFn: ({ signal }) =>
      mine ? classesApi.mine(filters.page, signal) : classesApi.list(filters, signal),
  });

export const useClassDetail = (id: string | null) =>
  useQuery({
    queryKey: classKeys.detail(id ?? ""),
    queryFn: ({ signal }) => classesApi.detail(id!, signal),
    enabled: Boolean(id),
  });

export const useDeletedClasses = (search: string, page: number) =>
  useQuery({
    queryKey: classKeys.deleted(search, page),
    queryFn: ({ signal }) => classesApi.deleted(search, page, signal),
  });

export const useTeachers = (search: string, enabled: boolean) =>
  useQuery({
    queryKey: classKeys.teachers(search),
    queryFn: ({ signal }) => classesApi.teachers(search, signal),
    enabled,
  });

export const useHistoryTeachers = (ids: string[], enabled: boolean) =>
  useQuery({
    queryKey: [...classKeys.all, "history-teachers", ids],
    enabled: enabled && ids.length > 0,
    queryFn: async ({ signal }) => {
      const remaining = new Set(ids);
      const names: Record<string, string> = {};
      let page = 1;
      while (remaining.size) {
        const result = await classesApi.teachers("", signal, page);
        for (const teacher of result.items) {
          if (remaining.delete(teacher.id)) names[teacher.id] = teacher.fullName;
        }
        if (page * result.pageSize >= result.totalCount || !result.items.length) break;
        page += 1;
      }
      return names;
    },
  });

export function useClassActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: classKeys.all });
  return {
    create: useMutation({
      mutationFn: (payload: CreateClassPayload) => classesApi.create(payload),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateClassPayload }) =>
        classesApi.update(id, payload),
      onSuccess: refresh,
    }),
    status: useMutation({
      mutationFn: ({ id, status }: { id: string; status: ClassStatus }) =>
        classesApi.changeStatus(id, status),
      onSuccess: refresh,
    }),
    archive: useMutation({ mutationFn: classesApi.archive, onSuccess: refresh }),
    restore: useMutation({ mutationFn: classesApi.restore, onSuccess: refresh }),
    remove: useMutation({ mutationFn: classesApi.remove, onSuccess: refresh }),
    adminRestore: useMutation({ mutationFn: classesApi.adminRestore, onSuccess: refresh }),
    removePermanent: useMutation({ mutationFn: classesApi.removePermanent, onSuccess: refresh }),
    assign: useMutation({
      mutationFn: ({ id, teacherId }: { id: string; teacherId: string }) =>
        classesApi.assignTeacher(id, teacherId),
      onSuccess: refresh,
    }),
    unassign: useMutation({ mutationFn: classesApi.unassignTeacher, onSuccess: refresh }),
  };
}
