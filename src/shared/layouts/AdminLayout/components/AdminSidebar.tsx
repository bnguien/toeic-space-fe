import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import mascotImg from "@/assets/mascot/oy2-hello.png";
import {
  IconAnalytics,
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconExams,
  IconLogout,
  IconRevenue,
  IconStudents,
  IconSystem,
  IconTeachers,
} from "@/shared/components/icons";
import { ADMIN_NAV_SECTIONS } from "@/shared/constants/adminNav";
import type { AdminAccount } from "@/shared/types/account.types";
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

// "Part 1 (Mô tả hình ảnh)" reads better as a bold part number followed by a muted name.
const PART_LABEL = /^(Part \d+) \((.+)\)$/;

const renderSubLabel = (label: string) => {
  const match = PART_LABEL.exec(label);
  return (
    <span className={styles.subLabel}>
      {match ? (
        <>
          {match[1]}
          <small>{match[2]}</small>
        </>
      ) : (
        label
      )}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Animated collapsible wrapper — measures real height, transitions   */
/* ------------------------------------------------------------------ */
interface CollapsibleProps {
  isOpen: boolean;
  children: React.ReactNode;
}

const Collapsible = ({ isOpen, children }: CollapsibleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (ref.current) {
      // Measure the *actual* rendered height of children
      setHeight(ref.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div
      className={styles.collapsible}
      inert={!isOpen}
      style={{
        maxHeight: isOpen ? `${height}px` : "0px",
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  account?: AdminAccount;
  onLogout?: () => void;
  loggingOut?: boolean;
}

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase() || "?";

export const AdminSidebar = ({
  collapsed,
  onToggleCollapse,
  account,
  onLogout,
  loggingOut = false,
}: AdminSidebarProps) => {
  const location = useLocation();

  // Kiểm tra chính xác 1 sub item có đang active không (Exact match, không dùng startsWith chung chung để tránh sáng trùng 2 ô)
  const isItemActive = (path?: string) => {
    if (!path) return false;
    if (path === "/admin/exams/list" && location.pathname.startsWith(`${path}/`)) return true;
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
      {/* Floating edge collapse toggle */}
      <button
        type="button"
        className={`${styles.edgeToggle} ${collapsed ? styles.edgeToggleCollapsed : ""}`}
        onClick={onToggleCollapse}
        title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        aria-expanded={!collapsed}
      >
        <IconChevronLeft size={14} />
      </button>
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
                aria-current={sectionActive ? "page" : undefined}
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
                className={`${styles.sectionHeader} ${sectionActive ? styles.sectionCurrent : ""}`}
                onClick={() => toggleSection(section.key)}
                aria-expanded={!collapsed && isOpen}
                aria-label={section.label}
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

              {/* Animated collapsible sub-list */}
              {!collapsed && hasChildren && (
                <Collapsible isOpen={isOpen}>
                  <div className={styles.subList}>
                    {section.children?.map((sub, idx) => {
                      const active = isItemActive(sub.path);
                      return (
                        <Link
                          key={sub.key}
                          to={sub.path}
                          aria-current={active ? "page" : undefined}
                          className={`${styles.subItem} ${active ? styles.subItemActive : ""}`}
                          style={{ transitionDelay: isOpen ? `${idx * 25}ms` : "0ms" }}
                        >
                          {renderSubLabel(sub.label)}
                          {sub.badge && <span className={styles.subBadge}>{sub.badge}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </Collapsible>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile — the edge toggle above is the single collapse control */}
      {account && (
        <div className={styles.footer}>
          <div
            className={styles.userCard}
            title={collapsed ? `${account.name} · ${account.roleLabel}` : undefined}
          >
            <div className={styles.userAvatar} aria-hidden="true">
              {getInitials(account.name)}
            </div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{account.name}</span>
                <span className={styles.userRole} title={account.email}>
                  {account.roleLabel} · {account.email}
                </span>
              </div>
            )}
            {onLogout && (
              <button
                type="button"
                className={styles.logoutBtn}
                onClick={onLogout}
                disabled={loggingOut}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <IconLogout size={17} />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
