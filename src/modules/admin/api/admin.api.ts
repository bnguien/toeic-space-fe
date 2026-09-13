import { httpClient } from "@/services/http";
import type { AdminOverviewResponse } from "../types/admin.types";

const mockOverview: AdminOverviewResponse = {
  totalStudents: 14280,
  activeStudentsToday: 1845,
  totalTeachers: 126,
  pendingTeacherApprovals: 8,
  totalExams: 345,
  testsCompletedThisWeek: 8920,
  monthlyRevenue: 285400000,
  revenueGrowthPercent: 18.5,
  systemHealth: "healthy",
  recentActivities: [
    {
      id: "act-1",
      type: "teacher",
      action: "Đăng ký giảng dạy khóa TOEIC Cấp Tốc 750+",
      target: "Thầy Hoàng Minh (TOEIC 985)",
      time: "5 phút trước",
      user: { name: "Hoàng Minh", role: "Giáo viên" },
    },
    {
      id: "act-2",
      type: "exam",
      action: "Tải lên bộ đề ETS 2024 Test 05 (Part 1 - 7)",
      target: "Hệ thống Khảo thí",
      time: "24 phút trước",
      user: { name: "Admin Content", role: "Quản trị viên" },
    },
    {
      id: "act-3",
      type: "order",
      action: "Thanh toán gói Premium Pro 6 Tháng thành công",
      target: "Mã ĐH: #ORD-98214 (1.490.000 VNĐ)",
      time: "42 phút trước",
      user: { name: "Nguyễn Thu Hà", role: "Học viên" },
    },
    {
      id: "act-4",
      type: "student",
      action: "Hoàn thành Full Test ETS Format với điểm số 845/990",
      target: "Đề thi thử tháng 9",
      time: "1 giờ trước",
      user: { name: "Trần Anh Quân", role: "Học viên" },
    },
    {
      id: "act-5",
      type: "system",
      action: "Tự động sao lưu ngân hàng câu hỏi lên Cloudflare R2",
      target: "Hệ thống sao lưu",
      time: "2 giờ trước",
      user: { name: "Cron Worker", role: "Hệ thống" },
    },
  ],
};

export const adminApi = {
  getOverview: async (): Promise<AdminOverviewResponse> => {
    try {
      const response = await httpClient.get<AdminOverviewResponse>("/api/admin/overview");
      return response.data;
    } catch {
      // Fallback khi backend microservices đang khởi động hoặc chưa có data
      return mockOverview;
    }
  },
};
