export { practiceRoutes } from "./routes";
export { PracticeSetManagementPage } from "./pages/PracticeSetManagementPage";
export { PracticeSetEditorPage } from "./pages/PracticeSetEditorPage";

/* Learner practice data other modules may show (profile, dashboards). */
export { practiceExamKeys } from "./api/practice-exam.query-keys";
export {
  useAttemptHistory,
  usePracticeStats,
  useSetsProgress,
  useTestsProgress,
} from "./hooks/usePracticeExamQueries";
export type {
  AttemptSummary,
  PracticeSpaceMode,
  PracticeStats,
  SetProgress,
  TestProgress,
} from "./types/practice-exam.types";
