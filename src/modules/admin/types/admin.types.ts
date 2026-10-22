export interface AdminStatCard {
  id: string;
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  subtitle: string;
  iconName: string;
  color: string;
}

export interface AdminRecentActivity {
  id: string;
  type: "teacher" | "student" | "exam" | "order" | "system";
  action: string;
  target: string;
  time: string;
  user: {
    name: string;
    avatar?: string;
    role: string;
  };
}

export interface AdminOverviewResponse {
  totalStudents: number;
  activeStudentsToday: number;
  totalTeachers: number;
  pendingTeacherApprovals: number;
  totalExams: number;
  testsCompletedThisWeek: number;
  monthlyRevenue: number;
  revenueGrowthPercent: number;
  systemHealth: "healthy" | "degraded" | "error";
  recentActivities: AdminRecentActivity[];
}

export interface NavSubItem {
  key: string;
  label: string;
  path: string;
  badge?: string | number;
}

export interface NavSection {
  key: string;
  label: string;
  icon: string;
  path?: string;
  children?: NavSubItem[];
}
