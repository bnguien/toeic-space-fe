import { useEffect, useId, useRef, useState } from "react";
import { Globe, KeyRound, LogOut, Moon, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { normalizeAvatarUrl } from "@/modules/profile";
import { IconChevronRight } from "@/shared/components/icons";
import { ADMIN_NAV_SECTIONS } from "@/shared/constants/adminNav";
import type { ColorMode } from "@/shared/hooks/useColorMode";
import type { AdminAccount } from "@/shared/types/account.types";

import styles from "./AdminHeader.module.css";

interface AdminHeaderProps {
  account?: AdminAccount;
  colorMode: ColorMode;
  onToggleColorMode: () => void;
  onLogout?: () => void;
  loggingOut?: boolean;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

function breadcrumb(pathname: string) {
  for (const section of ADMIN_NAV_SECTIONS) {
    if (section.path === pathname) return { parent: "Bảng điều khiển", current: section.label };
    const item = section.children?.find((child) => child.path === pathname);
    if (item) return { parent: section.label, current: item.label };
  }
  return { parent: "Admin", current: "Tổng quan" };
}

export const AdminHeader = ({
  account,
  colorMode,
  onToggleColorMode,
  onLogout,
  loggingOut = false,
}: AdminHeaderProps) => {
  const location = useLocation();
  const { parent, current } = breadcrumb(location.pathname);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadItem}>{parent}</span>
          <span className={styles.breadDivider} aria-hidden="true">
            <IconChevronRight size={14} />
          </span>
          <span className={styles.breadCurrent}>{current}</span>
        </div>
      </div>

      <div className={styles.right}>
        <Link
          to="/admin/system/config"
          className={styles.actionBtn}
          title="Cài đặt hệ thống"
          aria-label="Cài đặt hệ thống"
        >
          <Settings size={18} />
        </Link>
        <AccountMenu
          account={account}
          colorMode={colorMode}
          onToggleColorMode={onToggleColorMode}
          onLogout={onLogout}
          loggingOut={loggingOut}
        />
      </div>
    </header>
  );
};

/** Avatar button with the personal actions: password, website, colour mode and sign-out. */
function AccountMenu({
  account,
  colorMode,
  onToggleColorMode,
  onLogout,
  loggingOut,
}: AdminHeaderProps) {
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const location = useLocation();

  // A link in the menu navigates away: close it on every route change.
  const [openedAt, setOpenedAt] = useState(location.key);
  if (open && openedAt !== location.key) {
    setOpen(false);
    setOpenedAt(location.key);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const avatar = account?.avatarUrl
    ? (normalizeAvatarUrl(account.avatarUrl) ?? account.avatarUrl)
    : null;
  const dark = colorMode === "dark";

  return (
    <div className={styles.account} ref={anchorRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.avatarButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={account ? `Tài khoản ${account.name}` : "Tài khoản"}
        onClick={() => {
          setOpenedAt(location.key);
          setOpen((value) => !value);
        }}
      >
        <span className={styles.avatar} aria-hidden="true">
          {avatar && !avatarFailed ? (
            <img src={avatar} alt="" onError={() => setAvatarFailed(true)} />
          ) : (
            initials(account?.name ?? "?")
          )}
        </span>
      </button>

      {open && (
        <div className={styles.menu} id={menuId} role="menu">
          {account && (
            <div className={styles.menuHeader}>
              <strong>{account.name}</strong>
              <span>{account.email}</span>
              <small>{account.roleLabel}</small>
            </div>
          )}
          <Link to="/change-password" role="menuitem" className={styles.menuItem}>
            <KeyRound size={16} />
            Đổi mật khẩu
          </Link>
          <Link to="/" role="menuitem" className={styles.menuItem}>
            <Globe size={16} />
            Về trang web
          </Link>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={dark}
            className={styles.menuItem}
            onClick={onToggleColorMode}
          >
            <Moon size={16} />
            Chế độ tối
            <span
              className={styles.switch}
              data-on={dark ? "true" : undefined}
              aria-hidden="true"
            />
          </button>
          {onLogout && (
            <>
              <div className={styles.menuDivider} role="separator" />
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={onLogout}
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
