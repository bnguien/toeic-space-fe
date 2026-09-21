import type { NavSection } from "../types/nav.types";

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    key: "overview",
    label: "Tổng quan",
    icon: "▣",
    path: "/admin",
  },
  {
    key: "teachers",
    label: "Giáo viên",
    icon: "♙",
    children: [
      { key: "teachers-overview", label: "Tổng quan", path: "/admin/teachers" },
      { key: "teachers-list", label: "Danh sách giáo viên", path: "/admin/teachers/list" },
      {
        key: "teachers-approval",
        label: "Đăng ký / Phê duyệt",
        path: "/admin/teachers/approval",
        badge: "8 mới",
      },
      { key: "teachers-courses", label: "Khóa học", path: "/admin/teachers/courses" },
      { key: "teachers-activities", label: "Hoạt động", path: "/admin/teachers/activities" },
      { key: "teachers-stats", label: "Thống kê", path: "/admin/teachers/stats" },
    ],
  },
  {
    key: "students",
    label: "Học viên",
    icon: "♙",
    children: [
      { key: "students-overview", label: "Tổng quan", path: "/admin/students" },
      { key: "students-list", label: "Danh sách học viên", path: "/admin/students/list" },
      {
        key: "students-performance",
        label: "Hiệu quả học tập",
        path: "/admin/students/performance",
      },
      { key: "students-activities", label: "Hoạt động học", path: "/admin/students/activities" },
    ],
  },
  {
    key: "exams",
    label: "Ngân hàng đề",
    icon: "▣",
    children: [
      { key: "exams-overview", label: "Tổng quan", path: "/admin/exams" },
      { key: "exams-list", label: "Đề thi", path: "/admin/exams/list" },
      { key: "exams-part-1", label: "Part 1 (Mô tả hình ảnh)", path: "/admin/exams/part-1" },
      { key: "exams-part-2", label: "Part 2 (Hỏi - Đáp)", path: "/admin/exams/part-2" },
      { key: "exams-part-3", label: "Part 3 (Hội thoại ngắn)", path: "/admin/exams/part-3" },
      { key: "exams-part-4", label: "Part 4 (Bài nói ngắn)", path: "/admin/exams/part-4" },
      { key: "exams-part-5", label: "Part 5 (Điền câu)", path: "/admin/exams/part-5" },
      { key: "exams-part-6", label: "Part 6 (Điền đoạn văn)", path: "/admin/exams/part-6" },
      { key: "exams-part-7", label: "Part 7 (Đọc hiểu)", path: "/admin/exams/part-7" },
    ],
  },
  {
    key: "revenue",
    label: "Đơn hàng & Doanh thu",
    icon: "▣",
    children: [
      { key: "revenue-overview", label: "Tổng quan", path: "/admin/revenue" },
      { key: "revenue-orders", label: "Đơn hàng", path: "/admin/revenue/orders" },
      { key: "revenue-premium", label: "Premium", path: "/admin/revenue/premium" },
      { key: "revenue-courses", label: "Khóa học", path: "/admin/revenue/courses" },
      { key: "revenue-transactions", label: "Giao dịch", path: "/admin/revenue/transactions" },
      { key: "revenue-stats", label: "Thống kê doanh thu", path: "/admin/revenue/stats" },
    ],
  },
  {
    key: "analytics",
    label: "Phân tích",
    icon: "▣",
    children: [
      { key: "analytics-overview", label: "Tổng quan", path: "/admin/analytics" },
      { key: "analytics-attempts", label: "Lượt làm bài", path: "/admin/analytics/attempts" },
      {
        key: "analytics-performance",
        label: "Hiệu quả TOEIC",
        path: "/admin/analytics/performance",
      },
      { key: "analytics-parts", label: "Phân tích Part", path: "/admin/analytics/parts" },
      {
        key: "analytics-questions",
        label: "Phân tích câu hỏi",
        path: "/admin/analytics/questions",
      },
      { key: "analytics-behavior", label: "Hành vi người dùng", path: "/admin/analytics/behavior" },
    ],
  },
  {
    key: "system",
    label: "Hệ thống",
    icon: "⚙",
    children: [
      { key: "system-admins", label: "Admin", path: "/admin/system/admins" },
      { key: "system-roles", label: "Roles & Permissions", path: "/admin/system/roles" },
      { key: "system-notifications", label: "Thông báo", path: "/admin/system/notifications" },
      { key: "system-toeic-config", label: "Cấu hình TOEIC", path: "/admin/system/toeic-config" },
      {
        key: "system-content-config",
        label: "Cấu hình nội dung",
        path: "/admin/system/content-config",
      },
      { key: "system-error-reports", label: "Báo cáo lỗi", path: "/admin/system/error-reports" },
      { key: "system-audit-log", label: "Audit Log", path: "/admin/system/audit-log" },
      { key: "system-config", label: "Cấu hình hệ thống", path: "/admin/system/config" },
    ],
  },
];
