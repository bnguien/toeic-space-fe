import type { RouteObject } from "react-router-dom";

import type { AppRouteHandle } from "@/shared/types/route-handle.types";

import { VideoCatalogPage } from "./pages/VideoCatalogPage";
import { VideoWatchPage } from "./pages/VideoWatchPage";
import { VIDEO_CATALOG_PATH, VIDEO_WATCH_PATH } from "./utils/video-paths";

export const videoRoutes: RouteObject[] = [
  {
    path: VIDEO_CATALOG_PATH,
    element: <VideoCatalogPage />,
  },
  {
    // Full-screen reader: Studychill renders it without the site navbar.
    path: VIDEO_WATCH_PATH,
    element: <VideoWatchPage />,
    handle: { chrome: "bare" } satisfies AppRouteHandle,
  },
];
