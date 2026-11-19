import type { RouteObject } from "react-router-dom";
import { RequireAuth } from "@/modules/auth";
import { StudentClassesPage } from "./pages/StudentClassesPage";

export const studentRoutes: RouteObject[] = [
  {
    path: "/my-classes",
    element: (
      <RequireAuth roles={["User"]}>
        <StudentClassesPage />
      </RequireAuth>
    ),
  },
  {
    path: "/my-classes/:id",
    element: (
      <RequireAuth roles={["User"]}>
        <StudentClassesPage />
      </RequireAuth>
    ),
  },
];
