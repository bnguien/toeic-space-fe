import { useLocation } from "react-router-dom";

import mascotMini from "@/assets/mascot/oy2-cheer.png";
import { IconBell, IconSearch, IconSystem } from "@/shared/components/icons";
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
          <span className={styles.breadDivider}>/</span>
          <span className={styles.breadCurrent}>{currentTitle}</span>
        </div>

        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm học viên, đề thi, đơn hàng..."
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.mascotNotice}>
          <img src={mascotMini} alt="Oysteic mascot cheer" className={styles.mascotMini} />
          <span>Oysteic: 8 giáo viên mới chờ phê duyệt!</span>
        </div>

        <div className={styles.healthBadge}>
          <span className={styles.dotOnline} />
          <span>Gateway 5050 Online</span>
        </div>

        <button type="button" className={styles.actionBtn} title="Thông báo hệ thống">
          <IconBell size={18} />
          <span className={styles.badge}>5</span>
        </button>

        <button type="button" className={styles.actionBtn} title="Cài đặt nhanh">
          <IconSystem size={18} />
        </button>
      </div>
    </header>
  );
};
