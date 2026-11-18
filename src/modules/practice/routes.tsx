import type { RouteObject } from "react-router-dom";
import { PracticeSetsPage } from "./pages/PracticeSetsPage";
import { PracticeSetDetailPage } from "./pages/PracticeSetDetailPage";
import { RequireAuth } from "@/modules/auth";
import { PracticeAttemptPage } from "./pages/PracticeAttemptPage";

export const practiceRoutes: RouteObject[] = [
  {
    path: "/practice/attempts/:id",
    element: (
      <RequireAuth roles={["User"]}>
        <PracticeAttemptPage />
      </RequireAuth>
    ),
  },
  { path: "/practice/parts", element: <PracticeSetsPage /> },
  { path: "/practice/parts/:id", element: <PracticeSetDetailPage /> },
];
