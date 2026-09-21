import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ADMIN_NAV_SECTIONS } from "@/shared/constants/adminNav";
import { IconExams } from "@/shared/components/icons";
import type { AdminAccount } from "@/shared/types/account.types";

import styles from "./AdminLayout.module.css";
import { AdminHeader } from "./components/AdminHeader";
import { AdminSidebar } from "./components/AdminSidebar";

interface AdminLayoutProps {
  account?: AdminAccount;
  onLogout?: () => void;
  loggingOut?: boolean;
}

export const AdminLayout = ({ account, onLogout, loggingOut = false }: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className={styles.layout}>
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        account={account}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />

      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainWrapperCollapsed : ""}`}>
        <details className={styles.mobileNav}>
          <summary>
            <IconExams size={20} /> TOEIC SPACE <span>Menu</span>
          </summary>
          <nav aria-label="Điều hướng quản trị">
            {ADMIN_NAV_SECTIONS.map((section) => (
              <div key={section.key}>
                {section.path ? (
                  <Link to={section.path}>{section.label}</Link>
                ) : (
                  <>
                    <strong>{section.label}</strong>
                    {section.children?.map((item) => (
                      <Link
                        key={item.key}
                        to={item.path}
                        aria-current={location.pathname === item.path ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            ))}
            {onLogout && (
              <button
                type="button"
                className={styles.mobileLogout}
                onClick={onLogout}
                disabled={loggingOut}
              >
                {account ? `Đăng xuất (${account.email})` : "Đăng xuất"}
              </button>
            )}
          </nav>
        </details>
        <AdminHeader />
        <main key={location.pathname} className={`${styles.content} ${styles.pageEnter}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
