import { isAxiosError } from "axios";
import type { AuthUser } from "@/modules/auth";
import type { PracticeSet } from "../api/practice-sets.api";

export const kindLabels = { Level: "Theo cấp độ", Topic: "Theo chủ đề", PartDrill: "Luyện Part" };
export const statusLabels = {
  Draft: "Bản nháp",
  Active: "Đã xuất bản",
  Archived: "Đã ngừng xuất bản",
};
export const parts = Array.from({ length: 7 }, (_, i) => `Part${i + 1}`);
export const canManageSet = (user: AuthUser | null, set: PracticeSet) =>
  Boolean(
    user && (user.role === "Admin" || (user.role === "Teacher" && set.createdByUserId === user.id)),
  );
export const partLabel = (part: string) => part.replace("Part", "Part ");
export const isPracticeConflict = (error: unknown) =>
  isAxiosError(error) &&
  error.response?.status === 409 &&
  (error.response.data?.code ?? error.response.data?.errorCode) === "concurrency_conflict";
export function practiceError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { code?: string; errorCode?: string } | undefined;
    const code = (data?.code ?? data?.errorCode ?? "").replace(/[^a-z]/gi, "").toLowerCase();
    const status = error.response?.status;
    if (status === 401) return "Vui lòng đăng nhập để tiếp tục.";
    if (status === 403) return "Bạn không có quyền truy cập hoặc chỉnh sửa bộ luyện tập này.";
    if (status === 404) return "Không tìm thấy bộ luyện tập hoặc bộ chưa được xuất bản.";
    if (code.includes("practicesetnotpublishable"))
      return "Chưa thể xuất bản. Kiểm tra nội dung, Part, âm thanh và trạng thái các câu hỏi.";
    if (code.includes("duplicate")) return "Mã bộ luyện tập đã tồn tại. Vui lòng chọn mã khác.";
    if (code.includes("concurrency"))
      return "Dữ liệu đã thay đổi ở nơi khác. Tải lại trước khi lưu.";
    if (code.includes("questionlocked"))
      return "Câu hỏi đang được sử dụng bởi bộ đã xuất bản. Ngừng xuất bản trước khi thay đổi.";
    if (status === 400) return "Thông tin chưa hợp lệ. Kiểm tra các trường và câu hỏi đã chọn.";
    if (status === 409)
      return "Không thể lưu do dữ liệu xung đột. Kiểm tra mã bộ, nội dung xuất bản hoặc tải lại dữ liệu.";
  }
  return "Không tải hoặc lưu được dữ liệu. Vui lòng thử lại.";
}

export interface FilterValues {
  search: string;
  part: string;
  kind: string;
  level: string;
  status: string;
}
export const emptyFilters: FilterValues = { search: "", part: "", kind: "", level: "", status: "" };
