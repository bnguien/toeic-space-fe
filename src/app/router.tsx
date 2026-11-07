import { createBrowserRouter, type RouteObject } from "react-router-dom";

import App from "@/App";
import { adminRoutes } from "@/modules/admin";
import { authRoutes } from "@/modules/auth";
import { profileRoutes } from "@/modules/profile";
import { studentRoutes } from "@/modules/student";
import { teacherRoutes } from "@/modules/teacher";
import { RouteError } from "@/shared/components/RouteError/RouteError";
import {
  CourseCatalogPage,
  CourseDetailPage,
  CoursePreviewPage,
  CoursesLayout,
} from "@/modules/courses";
import { RootLayout } from "./RootLayout";

// Render errors and unknown paths (handled by the "/" route) show a friendly screen.
const withErrorScreen = (routes: RouteObject[]): RouteObject[] =>
  routes.map((route) => ({ ...route, errorElement: <RouteError /> }));

export const router = createBrowserRouter(
  withErrorScreen([
    {
      element: <RootLayout />,
      children: [
        {
          path: "/",
          element: <App />,
        },
        {
          element: <CoursesLayout />,
          children: [
            { path: "/courses", element: <CourseCatalogPage /> },
            { path: "/courses/:id", element: <CourseDetailPage /> },
            {
              path: "/courses/:courseId/lessons/:lessonId/preview",
              element: <CoursePreviewPage />,
            },
          ],
        },
        ...authRoutes,
        ...adminRoutes,
        ...teacherRoutes,
        ...profileRoutes,
        ...studentRoutes,
      ],
    },
  ]),
);
