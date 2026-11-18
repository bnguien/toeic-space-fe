import type { AssistantAgent, DepartmentKey } from "../types/assistant.types";

export const DEPARTMENT_ORDER: DepartmentKey[] = [
  "assessment",
  "growth",
  "classroom",
  "content",
  "marketing",
  "analytics",
  "unknown",
];

export const DEPARTMENT_LABELS: Record<DepartmentKey, string> = {
  assessment: "Đề thi & ngân hàng câu hỏi",
  growth: "Học viên & tăng trưởng",
  classroom: "Lớp học",
  content: "Khoá học & nội dung",
  marketing: "Marketing & chiến lược",
  analytics: "Phân tích",
  unknown: "Chuyên viên",
};

/** Questions each department answers well; shown beside the team list. */
export const DEPARTMENT_SUGGESTIONS: Record<DepartmentKey, string[]> = {
  assessment: [
    "Part nào trong ngân hàng câu hỏi đang thiếu?",
    "Phân bố độ khó của câu hỏi",
    "Số đề đang sử dụng theo năm",
  ],
  growth: [
    "Học viên mới 7 ngày qua",
    "Bao nhiêu tài khoản chưa xác thực email?",
    "Học viên hoạt động 30 ngày qua",
  ],
  classroom: ["Lớp nào đông học viên nhất?", "Các lớp kết thúc trong tháng này"],
  content: ["Khoá học nào có nhiều bài học nhất?", "Khoá học nào còn ở bản nháp?"],
  marketing: ["Gợi ý chiến dịch kéo học viên quay lại", "Nên đẩy khoá học nào trong tháng tới?"],
  analytics: ["Xu hướng đăng ký 30 ngày qua", "Tuần này có gì bất thường?"],
  unknown: [],
};

/** Questions offered on an empty conversation. */
export const GENERAL_SUGGESTIONS = [
  "Tổng quan số liệu hệ thống",
  "Part nào trong ngân hàng câu hỏi đang thiếu?",
  "Gửi mình xem mẫu 1 câu Part 1",
];

/** "toeic_space.assessment" → "assessment"; anything unknown → "unknown". */
export function departmentOf(capability: string | null | undefined): DepartmentKey {
  const key = (capability ?? "").split(".").pop()?.trim().toLowerCase() ?? "";
  return (DEPARTMENT_ORDER as string[]).includes(key) ? (key as DepartmentKey) : "unknown";
}

export const agentDepartment = (agent: AssistantAgent) => departmentOf(agent.capabilities[0]);

/** Team list order: by department, then by name. */
export function sortAgents(agents: AssistantAgent[]): AssistantAgent[] {
  return [...agents].sort(
    (a, b) =>
      DEPARTMENT_ORDER.indexOf(agentDepartment(a)) - DEPARTMENT_ORDER.indexOf(agentDepartment(b)) ||
      a.name.localeCompare(b.name, "vi"),
  );
}
