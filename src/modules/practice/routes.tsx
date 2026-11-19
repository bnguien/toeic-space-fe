import type { ComponentType } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

import { RequireAuth } from "@/modules/auth";
import type { AppRouteHandle } from "@/shared/types/route-handle.types";

import { PracticeSetsPage } from "./pages/PracticeSetsPage";
import type { PracticeSpaceMode } from "./types/practice-exam.types";

const bare = { chrome: "bare" } satisfies AppRouteHandle;

/** Lazy route showing `Page` to a signed-in learner (role "User"). */
const learnerPage =
  (load: () => Promise<ComponentType>) => async (): Promise<Pick<RouteObject, "element">> => {
    const Page = await load();
    return {
      element: (
        <RequireAuth roles={["User"]}>
          <Page />
        </RequireAuth>
      ),
    };
  };

/** Lazy practice space route (guests may browse; actions ask them to sign in). */
const spacePage = (mode: PracticeSpaceMode) => async (): Promise<Pick<RouteObject, "element">> => {
  const { PracticeSpacePage } = await import("./pages/PracticeSpacePage");
  return { element: <PracticeSpacePage mode={mode} /> };
};

export const practiceRoutes: RouteObject[] = [
  { path: "/practice", element: <Navigate to="/practice/exam" replace /> },
  /* Practice space: Luyện Đề / Luyện Nghe / Luyện Đọc / Lịch sử làm bài */
  { path: "/practice/exam", handle: bare, lazy: spacePage("exam") },
  { path: "/practice/listening", handle: bare, lazy: spacePage("listening") },
  { path: "/practice/reading", handle: bare, lazy: spacePage("reading") },
  {
    path: "/practice/history",
    handle: bare,
    lazy: async () => {
      const { PracticeSpacePage } = await import("./pages/PracticeSpacePage");
      return {
        element: (
          <RequireAuth roles={["User"]}>
            <PracticeSpacePage mode="history" />
          </RequireAuth>
        ),
      };
    },
  },
  /* Mock exam room (FullTest) */
  {
    path: "/practice/tests/:testId/exam",
    handle: bare,
    lazy: learnerPage(async () => (await import("./pages/ExamRoomPage")).ExamRoomPage),
  },
  /* Practice workspace, its read-only review and the result page */
  {
    path: "/practice/attempts/:attemptId",
    handle: bare,
    lazy: learnerPage(
      async () => (await import("./pages/PracticeWorkspacePage")).PracticeWorkspacePage,
    ),
  },
  {
    path: "/practice/attempts/:attemptId/review",
    handle: bare,
    lazy: async () => {
      const { PracticeWorkspacePage } = await import("./pages/PracticeWorkspacePage");
      return {
        element: (
          <RequireAuth roles={["User"]}>
            <PracticeWorkspacePage reviewOnly />
          </RequireAuth>
        ),
      };
    },
  },
  {
    path: "/practice/attempts/:attemptId/result",
    handle: bare,
    lazy: learnerPage(async () => (await import("./pages/AttemptResultPage")).AttemptResultPage),
  },
  /* Practice sets: catalogue (kept) and "Góc luyện tập" (staff keep the preview there).
     Not bare: staff preview and guests keep the site navbar. */
  { path: "/practice/parts", element: <PracticeSetsPage /> },
  {
    path: "/practice/parts/:id",
    lazy: async () => ({
      Component: (await import("./pages/PracticeSetupPage")).PracticeSetupPage,
    }),
  },
];
