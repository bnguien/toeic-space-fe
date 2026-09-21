import { createBrowserRouter, type RouteObject } from "react-router-dom";

import App from "@/App";
import { adminRoutes } from "@/modules/admin";
import { authRoutes } from "@/modules/auth";
import { RouteError } from "@/shared/components/RouteError/RouteError";

// Render errors and unknown paths (handled by the "/" route) show a friendly screen.
const withErrorScreen = (routes: RouteObject[]): RouteObject[] =>
  routes.map((route) => ({ ...route, errorElement: <RouteError /> }));

export const router = createBrowserRouter(
  withErrorScreen([
    {
      path: "/",
      element: <App />,
    },
    ...authRoutes,
    ...adminRoutes,
  ]),
);
