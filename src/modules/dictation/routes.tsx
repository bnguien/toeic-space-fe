import type { RouteObject } from "react-router-dom";

import type { AppRouteHandle } from "@/shared/types/route-handle.types";

// Pages load on demand: the play screen and the Phaser roadmap stay out of the main bundle.
const gamePage = async () => ({
  Component: (await import("./pages/DictationGamePage")).DictationGamePage,
});
const playPage = async () => ({
  Component: (await import("./pages/CoursePlayPage")).CoursePlayPage,
});

export const dictationRoutes: RouteObject[] = [
  {
    // Catalog; `?pack=` opens the full-screen map of a pack (topic map or TOEIC roadmap).
    path: "/games/dictation",
    lazy: gamePage,
  },
  {
    // A course of a topic pack: ?pack=&course=&mode=
    path: "/games/dictation/play",
    handle: { chrome: "bare" } satisfies AppRouteHandle,
    lazy: playPage,
  },
  {
    // A stage of the TOEIC roadmap: ?level=&stage=&ids=&course=&mode=
    path: "/games/dictation/toeic",
    handle: { chrome: "bare" } satisfies AppRouteHandle,
    lazy: playPage,
  },
];
