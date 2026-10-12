import type { RouteObject } from "react-router-dom";

import { RequireAuth } from "@/modules/auth";

import { ProfilePage } from "./pages/ProfilePage";

export const profileRoutes: RouteObject[] = [
  {
    path: "/profile",
    element: (
      <RequireAuth>
        <ProfilePage />
      </RequireAuth>
    ),
  },
];
