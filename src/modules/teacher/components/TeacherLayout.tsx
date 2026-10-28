import { useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

import mascotLogo from "@/assets/mascot/oy2-hello.png";
import { useCurrentUser, useLogout } from "@/modules/auth";
import { normalizeAvatarUrl } from "@/modules/profile";
import styles from "./TeacherLayout.module.css";

const navigation = [
  {
    to: "/teacher",
    label: "Tổng quan",
    sublabel: "Bảng điều khiển",
    icon: LayoutDashboard,
    exact: true,
  },
  { to: "/teacher/classes", label: "Lớp học", sublabel: "Được phân công", icon: GraduationCap },
  { to: "/teacher/courses", label: "Khóa học", sublabel: "Học liệu", icon: BookOpen },
  {
    to: "/teacher/assignments",
    label: "Bài tập",
    sublabel: "Giao và chấm bài",
    icon: ClipboardList,
  },
  {
    to: "/teacher/schedule",
    label: "Lịch giảng dạy",
    sublabel: "Thời khóa biểu",
    icon: CalendarDays,
  },
  {
    to: "/teacher/messages",
    label: "Tin nhắn",
    sublabel: "Trao đổi lớp học",
    icon: MessageSquare,
    badge: "4",
  },
];
const utilities = [
  { to: "/teacher/settings", label: "Cài đặt", sublabel: "Hồ sơ cá nhân", icon: Settings },
  { to: "/teacher/security", label: "Bảo mật", sublabel: "Tài khoản", icon: Shield },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export function TeacherLayout() {
  const user = useCurrentUser();
  const logout = useLogout();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);
  const nav = (items: typeof navigation) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setMenuOpen(false)}
          className={`${styles.navItem} ${active(item.to, item.exact) ? styles.navItemActive : ""}`}
        >
          <Icon size={18} />
          <span>
            <b>{item.label}</b>
            <small>{item.sublabel}</small>
          </span>
          {item.badge && <i>{item.badge}</i>}
        </Link>
      );
    });
  const avatar = user?.avatarUrl ? (normalizeAvatarUrl(user.avatarUrl) ?? user.avatarUrl) : null;
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <Link to="/teacher" className={styles.brandLink} onClick={() => setMenuOpen(false)}>
            <img src={mascotLogo} alt="" className={styles.brandMascot} />
            <span className={styles.brandText}>TOEICSpace</span>
          </Link>
          <span className={styles.brandSubtitle}>Cổng thông tin giáo viên</span>
          <button onClick={() => setMenuOpen(false)} aria-label="Đóng menu">
            <X size={19} />
          </button>
        </div>
        <div className={styles.navArea}>
          <p>CÔNG CỤ GIẢNG DẠY</p>
          <nav>{nav(navigation)}</nav>
          <p>TIỆN ÍCH</p>
          <nav>{nav(utilities as typeof navigation)}</nav>
        </div>
        <div className={styles.help}>
          <Headphones size={18} />
          <b>Hỗ trợ giảng viên</b>
          <span>Phản hồi nhanh trong 5 phút</span>
          <button>Đến trung tâm hỗ trợ</button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className={styles.overlay}
          aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className={styles.main}>
        <header className={styles.header}>
          <button
            className={styles.menuButton}
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={21} />
          </button>
          <div className={styles.greeting}>
            <span>{greeting},</span>
            <strong>{user?.fullName || "Giáo viên"}!</strong>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.bell} aria-label="Thông báo">
              <Bell size={18} />
              <i>4</i>
            </button>
            <Link to="/teacher/settings" className={styles.profile}>
              {avatar ? (
                <img src={avatar} alt="" />
              ) : (
                <span>{initials(user?.fullName || "Giảng viên")}</span>
              )}
              <div>
                <b>{user?.fullName || "Giảng viên"}</b>
                <small>Teacher / Giảng viên</small>
              </div>
            </Link>
            <button
              className={styles.logout}
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
