import type { RouteObject } from "react-router-dom";
import { PracticeSetsPage } from "./pages/PracticeSetsPage";
import { PracticeSetDetailPage } from "./pages/PracticeSetDetailPage";

export const practiceRoutes: RouteObject[] = [
  { path: "/practice/parts", element: <PracticeSetsPage /> },
  { path: "/practice/parts/:id", element: <PracticeSetDetailPage /> },
];
