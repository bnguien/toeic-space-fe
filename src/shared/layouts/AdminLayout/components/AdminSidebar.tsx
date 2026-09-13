import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import mascotImg from "@/assets/mascot/oy2-hello.png";
import {
  IconAnalytics,
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconExams,
  IconRevenue,
  IconStudents,
  IconSystem,
  IconTeachers,
} from "@/shared/components/icons";
import { ADMIN_NAV_SECTIONS } from "@/shared/constants/adminNav";
import type { NavSection } from "@/shared/types/nav.types";

import styles from "./AdminSidebar.module.css";

const getSectionIcon = (key: string) => {
  switch (key) {
    case "overview":
      return <IconDashboard size={19} />;
    case "teachers":
      return <IconTeachers size={19} />;
    case "students":
      return <IconStudents size={19} />;
    case "exams":
      return <IconExams size={19} />;
    case "revenue":
      return <IconRevenue size={19} />;
    case "analytics":
      return <IconAnalytics size={19} />;
    case "system":
      return <IconSystem size={19} />;
    default:
      return <IconDashboard size={19} />;
  }
};

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const AdminSidebar = ({ collapsed, onToggleCollapse }: AdminSidebarProps) => {
  const location = useLocation();

  // Kiểm tra chính xác 1 sub item có đang active không (Exact match, không dùng startsWith chung chung để tránh sáng trùng 2 ô)
  const isItemActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  // Xác định section nào chứa đường dẫn hiện tại
  const findActiveSectionKey = (pathname: string): string | null => {
    if (pathname === "/admin") return "overview";
    for (const section of ADMIN_NAV_SECTIONS) {
      if (section.path === pathname) return section.key;
      if (section.children?.some((child) => child.path === pathname)) {
        return section.key;
      }
    }
    // Fallback nếu có sub-path sâu hơn: /admin/:section/*
    for (const section of ADMIN_NAV_SECTIONS) {
      if (section.children?.some((child) => child.path && pathname.startsWith(child.path))) {
        return section.key;
      }
    }
    return null;
  };

  const isSectionActive = (section: NavSection) => {
    if (section.path && isItemActive(section.path)) return true;
    return section.children?.some((child) => isItemActive(child.path)) ?? false;
  };

  const activeSectionKey = findActiveSectionKey(location.pathname);
  // Manual override by user toggle (if user manually opens/closes a section)
  const [manualSectionKey, setManualSectionKey] = useState<{
    path: string;
    key: string | null;
  }>({
    path: location.pathname,
    key: activeSectionKey,
  });

  // If path changed, use activeSectionKey, otherwise respect manual toggle
  const openSectionKey =
    manualSectionKey.path === location.pathname ? manualSectionKey.key : activeSectionKey;

  const toggleSection = (key: string) => {
    if (collapsed) {
      onToggleCollapse();
    }
    const currentOpen = openSectionKey;
    setManualSectionKey({
      path: location.pathname,
      key: currentOpen === key ? null : key,
    });
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* Brand Header */}
      <div className={styles.brand}>
        <img src={mascotImg} alt="Oysteic Mascot" className={styles.brandMascot} />
        {!collapsed && (
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>TOEIC SPACE</span>
            <span className={styles.brandBadge}>ADMIN CMS</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className={styles.navContainer}>
        {ADMIN_NAV_SECTIONS.map((section) => {
          const hasChildren = Boolean(section.children) && (section.children?.length ?? 0) > 0;
          const sectionActive = isSectionActive(section);
          const isOpen = openSectionKey === section.key;

          if (!hasChildren && section.path) {
            return (
              <Link
                key={section.key}
                to={section.path}
                className={`${styles.sectionHeader} ${sectionActive ? styles.sectionActive : ""}`}
                title={collapsed ? section.label : undefined}
              >
                <div className={styles.sectionLeft}>
                  <span className={styles.sectionIcon}>{getSectionIcon(section.key)}</span>
                  {!collapsed && <span className={styles.sectionTitle}>{section.label}</span>}
                </div>
              </Link>
            );
          }

          return (
            <div key={section.key} className={styles.sectionGroup}>
              <button
                type="button"
                className={`${styles.sectionHeader} ${sectionActive ? styles.sectionActive : ""}`}
                onClick={() => toggleSection(section.key)}
                title={collapsed ? section.label : undefined}
              >
                <div className={styles.sectionLeft}>
                  <span className={styles.sectionIcon}>{getSectionIcon(section.key)}</span>
                  {!collapsed && <span className={styles.sectionTitle}>{section.label}</span>}
                </div>
                {!collapsed && (
                  <span className={`${styles.arrowIcon} ${isOpen ? styles.arrowOpen : ""}`}>
                    <IconChevronRight size={14} />
                  </span>
                )}
              </button>

              {!collapsed && isOpen && hasChildren && (
                <div className={styles.subList}>
                  {section.children?.map((sub) => {
                    const active = isItemActive(sub.path);
                    return (
                      <Link
                        key={sub.key}
                        to={sub.path}
                        className={`${styles.subItem} ${active ? styles.subItemActive : ""}`}
                      >
                        <span>{sub.label}</span>
                        {sub.badge && <span className={styles.subBadge}>{sub.badge}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile & Collapse button */}
      <div className={styles.footer}>
        {!collapsed && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>AD</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Administrator</span>
              <span className={styles.userRole}>admin@toeicspace.vn</span>
            </div>
          </div>
        )}
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={onToggleCollapse}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};
