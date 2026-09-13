import type { RouteObject } from "react-router-dom";

import { AdminLayout } from "@/shared/layouts/AdminLayout";

import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminSectionPage } from "./pages/AdminSectionPage";

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: <AdminLayout />,
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
      { path: "exams", element: <AdminSectionPage /> },
      { path: "exams/list", element: <AdminSectionPage /> },
      { path: "exams/question-sets", element: <AdminSectionPage /> },
      { path: "exams/part-1", element: <AdminSectionPage /> },
      { path: "exams/part-2", element: <AdminSectionPage /> },
      { path: "exams/part-3", element: <AdminSectionPage /> },
      { path: "exams/part-4", element: <AdminSectionPage /> },
      { path: "exams/part-5", element: <AdminSectionPage /> },
      { path: "exams/part-6", element: <AdminSectionPage /> },
      { path: "exams/part-7", element: <AdminSectionPage /> },
      { path: "exams/tags", element: <AdminSectionPage /> },
      { path: "exams/import", element: <AdminSectionPage /> },
      { path: "exams/reports", element: <AdminSectionPage /> },

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
