import { Link, useLocation } from "react-router-dom";

import { IconBell, IconChevronRight, IconSystem } from "@/shared/components/icons";
import { ADMIN_NAV_SECTIONS } from "@/shared/constants/adminNav";

import styles from "./AdminHeader.module.css";

export const AdminHeader = () => {
  const location = useLocation();

  // Tìm label breadcrumb từ đường dẫn hiện tại
  let currentTitle = "Tổng quan";
  let parentTitle = "Admin";

  for (const section of ADMIN_NAV_SECTIONS) {
    if (section.path === location.pathname) {
      currentTitle = section.label;
      parentTitle = "Bảng điều khiển";
      break;
    }
    const matchedSub = section.children?.find((sub) => sub.path === location.pathname);
    if (matchedSub) {
      currentTitle = matchedSub.label;
      parentTitle = section.label;
      break;
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadItem}>{parentTitle}</span>
          <span className={styles.breadDivider} aria-hidden="true">
            <IconChevronRight size={14} />
          </span>
          <span className={styles.breadCurrent}>{currentTitle}</span>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.workspaceLabel}>Không gian quản trị</span>
        <Link
          to="/admin/system/notifications"
          className={styles.actionBtn}
          title="Thông báo hệ thống"
          aria-label="Thông báo hệ thống"
        >
          <IconBell size={18} />
        </Link>

        <Link
          to="/admin/system/config"
          className={styles.actionBtn}
          title="Cài đặt hệ thống"
          aria-label="Cài đặt hệ thống"
        >
          <IconSystem size={18} />
        </Link>
      </div>
    </header>
  );
};
