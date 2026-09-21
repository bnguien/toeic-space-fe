import { Navigate, type RouteObject } from "react-router-dom";

import { CONTENT_MANAGER_ROLES, RequireAuth } from "@/modules/auth";

import { AdminShell } from "./components/AdminShell";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminExamBankPage } from "./pages/AdminExamBankPage";
import { AdminExamsListPage } from "./pages/AdminExamsListPage";
import { AdminPartQuestionsPage } from "./pages/AdminPartQuestionsPage";
import { AdminSectionPage } from "./pages/AdminSectionPage";

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    // Every admin page requires an Admin or Teacher session; the API checks the same roles.
    element: (
      <RequireAuth roles={CONTENT_MANAGER_ROLES}>
        <AdminShell />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },

      /* Giáo viên */
      { path: "teachers", element: <AdminSectionPage /> },
      { path: "teachers/list", element: <AdminSectionPage /> },
      { path: "teachers/approval", element: <AdminSectionPage /> },
      { path: "teachers/courses", element: <AdminSectionPage /> },
      { path: "teachers/activities", element: <AdminSectionPage /> },
      { path: "teachers/stats", element: <AdminSectionPage /> },

      /* Học viên */
      { path: "students", element: <AdminSectionPage /> },
      { path: "students/list", element: <AdminSectionPage /> },
      { path: "students/performance", element: <AdminSectionPage /> },
      { path: "students/activities", element: <AdminSectionPage /> },

      /* Ngân hàng đề */
      { path: "exams", element: <AdminExamBankPage /> },
      { path: "exams/list", element: <AdminExamsListPage /> },
      ...Array.from({ length: 7 }, (_, index) => ({
        path: `exams/list/:testId/part-${index + 1}`,
        element: <AdminPartQuestionsPage key={`exam-${index + 1}`} part={index + 1} />,
      })),
      ...Array.from({ length: 7 }, (_, index) => ({
        path: `exams/part-${index + 1}`,
        element: <AdminPartQuestionsPage key={index + 1} part={index + 1} />,
      })),
      ...["question-sets", "tags", "import", "reports"].map((path) => ({
        path: `exams/${path}`,
        element: <Navigate to="/admin/exams/list" replace />,
      })),

      /* Đơn hàng & Doanh thu */
      { path: "revenue", element: <AdminSectionPage /> },
      { path: "revenue/orders", element: <AdminSectionPage /> },
      { path: "revenue/premium", element: <AdminSectionPage /> },
      { path: "revenue/courses", element: <AdminSectionPage /> },
      { path: "revenue/transactions", element: <AdminSectionPage /> },
      { path: "revenue/stats", element: <AdminSectionPage /> },

      /* Phân tích */
      { path: "analytics", element: <AdminSectionPage /> },
      { path: "analytics/attempts", element: <AdminSectionPage /> },
      { path: "analytics/performance", element: <AdminSectionPage /> },
      { path: "analytics/parts", element: <AdminSectionPage /> },
      { path: "analytics/questions", element: <AdminSectionPage /> },
      { path: "analytics/behavior", element: <AdminSectionPage /> },

      /* Hệ thống */
      { path: "system/admins", element: <AdminSectionPage /> },
      { path: "system/roles", element: <AdminSectionPage /> },
      { path: "system/notifications", element: <AdminSectionPage /> },
      { path: "system/toeic-config", element: <AdminSectionPage /> },
      { path: "system/content-config", element: <AdminSectionPage /> },
      { path: "system/error-reports", element: <AdminSectionPage /> },
      { path: "system/audit-log", element: <AdminSectionPage /> },
      { path: "system/config", element: <AdminSectionPage /> },
    ],
  },
];
