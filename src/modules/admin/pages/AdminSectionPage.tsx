import { useLocation } from "react-router-dom";

import { ADMIN_NAV_SECTIONS } from "@/shared/constants/adminNav";
import { AdminPage, ButtonLink, EmptyState } from "../components/ui";

/** Pages that already have real data, offered from sections that are not built yet. */
const RELATED: Record<string, { label: string; to: string }[]> = {
  teachers: [
    { label: "Danh sách giáo viên", to: "/admin/teachers/list" },
    { label: "Hoạt động giáo viên", to: "/admin/teachers/activities" },
  ],
  students: [
    { label: "Danh sách học viên", to: "/admin/students/list" },
    { label: "Hoạt động học viên", to: "/admin/students/activities" },
  ],
  analytics: [
    { label: "Tổng quan ngân hàng", to: "/admin/exams" },
    { label: "Tài khoản", to: "/admin/system/users" },
  ],
  system: [
    { label: "Tất cả tài khoản", to: "/admin/system/users" },
    { label: "Quản trị viên", to: "/admin/system/admins" },
  ],
  revenue: [{ label: "Về tổng quan", to: "/admin" }],
};

function findPage(pathname: string) {
  for (const section of ADMIN_NAV_SECTIONS) {
    if (section.path === pathname) return { section, title: section.label };
    const item = section.children?.find((child) => child.path === pathname);
    if (item) return { section, title: item.label };
  }
  return null;
}

/**
 * Menu entries whose backend does not exist yet. They say so plainly instead of showing
 * sample figures that look real.
 */
export const AdminSectionPage = () => {
  const { pathname } = useLocation();
  const page = findPage(pathname);
  const related = (page && RELATED[page.section.key]) ?? [];

  return (
    <AdminPage eyebrow={page?.section.label} title={page?.title ?? "Quản trị"}>
      <EmptyState
        framed
        title="Chưa có dữ liệu"
        description="Mục này đang được phát triển và chưa kết nối API."
        action={
          related.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {related.map((link) => (
                <ButtonLink key={link.to} to={link.to} size="sm">
                  {link.label}
                </ButtonLink>
              ))}
            </div>
          )
        }
      />
    </AdminPage>
  );
};
