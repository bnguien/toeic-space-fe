import type { RouteObject } from "react-router-dom";

import type { AppRouteHandle } from "@/shared/types/route-handle.types";

import { NewsArticlePage } from "./pages/NewsArticlePage";
import { NewsListPage } from "./pages/NewsListPage";

export const newsRoutes: RouteObject[] = [
  {
    path: "/games/news",
    element: <NewsListPage />,
  },
  {
    path: "/games/news/:slug",
    element: <NewsArticlePage />,
    handle: { chrome: "bare" } satisfies AppRouteHandle,
  },
];
