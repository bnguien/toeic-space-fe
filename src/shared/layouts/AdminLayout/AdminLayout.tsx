import { useState } from "react";
import { Outlet } from "react-router-dom";

import styles from "./AdminLayout.module.css";
import { AdminHeader } from "./components/AdminHeader";
import { AdminSidebar } from "./components/AdminSidebar";

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.layout}>
      <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />

      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainWrapperCollapsed : ""}`}>
        <AdminHeader />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
