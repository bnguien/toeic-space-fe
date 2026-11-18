import { httpClient } from "@/services/http";
import type { StudentConflictPreview } from "@/shared/types/student-conflicts.types";

const endpoint = "/classroom/api/v1/students/me/schedule-conflicts";

/** Student-scoped, explicit on-demand read. It does not run as part of normal calendar fetching. */
export const studentScheduleConflictsApi = {
  check: async (from: string, to: string) =>
    (
      await httpClient.get<StudentConflictPreview>(endpoint, {
        params: { from, to, detailsPage: 1, detailsPageSize: 100 },
      })
    ).data,
};
