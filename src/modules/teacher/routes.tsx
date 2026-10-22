import type { RouteObject } from "react-router-dom";
import { RequireAuth } from "@/modules/auth";
import { TeacherLayout } from "./components/TeacherLayout";
import { TeacherClassesPage } from "./pages/TeacherClassesPage";
import { TeacherDashboardPage } from "./pages/TeacherDashboardPage";
import { TeacherMockPage } from "./pages/TeacherMockPage";
import { TeacherProfilePage } from "./pages/TeacherProfilePage";
import { TeacherSchedulePage } from "./pages/TeacherSchedulePage";

export const teacherRoutes: RouteObject[] = [
  {
    path: "/teacher",
    element: (
      <RequireAuth roles={["Teacher"]}>
        <TeacherLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TeacherDashboardPage /> },
      { path: "classes", element: <TeacherClassesPage /> },
      { path: "courses", element: <TeacherMockPage title="Khóa học" /> },
      { path: "assignments", element: <TeacherMockPage title="Bài tập" /> },
      { path: "schedule", element: <TeacherSchedulePage /> },
      { path: "messages", element: <TeacherMockPage title="Tin nhắn" /> },
      { path: "settings", element: <TeacherProfilePage /> },
      { path: "security", element: <TeacherMockPage title="Bảo mật" /> },
    ],
  },
];
