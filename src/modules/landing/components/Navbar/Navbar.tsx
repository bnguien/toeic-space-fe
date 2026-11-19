import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout, useSessionStatus } from "@/modules/auth";
import {
  IconBook,
  IconHistory,
  IconLogout,
  IconPearlOrb,
  IconSettings,
} from "../icons/LandingIcons";
import { Map as IconMap, Moon, Sun, User as IconUserProfile } from "lucide-react";
import mascotLogo from "@/assets/mascot/oy2-hello.png";
import { normalizeAvatarUrl } from "@/modules/profile";
import { useColorMode, useColorModeScopeActive } from "@/shared/hooks/useColorMode";
import { openSiteMap } from "@/shared/utils/site-map-events";
import styles from "./Navbar.module.css";

const getInitials = (name: string) => {
  if (!name) return "TS";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Site navbar: logo, ONE menu item "Bản đồ" (opens the site map, which lists every page), the
 * light/dark switch and the account controls.
 */
export const Navbar = () => {
  const user = useCurrentUser();
  const sessionStatus = useSessionStatus();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const colorMode = useColorMode();
  const colorModeScoped = useColorModeScopeActive();

  const isLogin = location.pathname.startsWith("/login") || location.pathname === "/admin/login";
  const isRegister = location.pathname.startsWith("/register");
  const activeAuthPosition: "home" | "login" | "register" = isLogin
    ? "login"
    : isRegister
      ? "register"
      : "home";

  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledState = isScrolled || location.pathname !== "/";
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const pillRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLAnchorElement>(null);
  const loginRef = useRef<HTMLAnchorElement>(null);
  const registerRef = useRef<HTMLAnchorElement>(null);
  const [gliderAnimated, setGliderAnimated] = useState(false);

  const getInitialGliderPos = useCallback((pos: "home" | "login" | "register") => {
    if (pos === "login") return { left: 49, width: 110 };
    if (pos === "register") return { left: 161, width: 94 };
    return { left: 3, width: 44 };
  }, []);

  const [gliderPos, setGliderPos] = useState(() => getInitialGliderPos(activeAuthPosition));

  const updateGlider = useCallback(() => {
    const container = pillRef.current;
    if (!container) return;

    let targetEl: HTMLElement | null = null;
    if (activeAuthPosition === "login") {
      targetEl = loginRef.current;
    } else if (activeAuthPosition === "register") {
      targetEl = registerRef.current;
    } else {
      targetEl = orbRef.current;
    }

    if (!targetEl) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    if (containerRect.width === 0 || targetRect.width === 0) return;

    const left = targetRect.left - containerRect.left;
    const width = targetRect.width;

    setGliderPos({ left, width });
  }, [activeAuthPosition]);

  const handlePillRef = useCallback(
    (el: HTMLDivElement | null) => {
      pillRef.current = el;
      if (el) {
        updateGlider();
        requestAnimationFrame(updateGlider);
      }
    },
    [updateGlider],
  );

  useLayoutEffect(() => {
    updateGlider();
  }, [updateGlider, sessionStatus, user]);

  useEffect(() => {
    updateGlider();
    const frameId = requestAnimationFrame(updateGlider);

    // Enable smooth glider transitions after mount to prevent reload flash
    const timer = setTimeout(() => {
      setGliderAnimated(true);
    }, 60);

    window.addEventListener("resize", updateGlider);
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateGlider);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && pillRef.current) {
      ro = new ResizeObserver(() => {
        updateGlider();
      });
      ro.observe(pillRef.current);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
      window.removeEventListener("resize", updateGlider);
      if (ro) ro.disconnect();
    };
  }, [updateGlider, sessionStatus, user]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  // Monitor scroll state for navbar backdrop
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // User avatar dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /** Logo: back to the top of the home page. */
  const goHome = () => {
    if (location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    else navigate("/");
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  const go = (path: string) => {
    setDropdownOpen(false);
    navigate(path);
  };

  return (
    <header className={`${styles.header} ${isScrolledState ? styles.scrolled : ""}`}>
      <div className={styles.navInner}>
        {/* Left: TOEICSpace Clean Brand Logo with Mascot */}
        <a
          href="/"
          className={styles.brandLink}
          onClick={(e) => {
            e.preventDefault();
            goHome();
          }}
          aria-label="TOEICSpace Trang chủ"
        >
          <img src={mascotLogo} alt="TOEICSpace Mascot" className={styles.brandMascotImg} />
          <span className={styles.brandText}>TOEICSpace</span>
        </a>

        {/* Right: Authentication Actions */}
        <div className={styles.authGroup}>
          {colorModeScoped && (
            <button
              type="button"
              className={styles.modeToggle}
              onClick={colorMode.toggle}
              aria-label={colorMode.mode === "dark" ? "Giao diện sáng" : "Giao diện tối"}
              title={colorMode.mode === "dark" ? "Giao diện sáng" : "Giao diện tối"}
            >
              {colorMode.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          {/* The only menu item: every page is listed in the site map. Sits next to the account. */}
          <button
            type="button"
            className={styles.mapButton}
            onClick={openSiteMap}
            aria-haspopup="dialog"
            aria-label="Bản đồ"
          >
            <IconMap size={17} aria-hidden="true" />
            <span>Bản đồ</span>
          </button>
          {sessionStatus === "restoring" && !user ? (
            <div className={styles.authSkeleton} aria-hidden="true" />
          ) : !user ? (
            /* Unauthenticated state: Segmented toggle pill with sliding indicator */
            <div
              ref={handlePillRef}
              className={styles.authPill}
              role="navigation"
              aria-label="Xác thực tài khoản"
            >
              {/* Sliding blue capsule glider */}
              <div
                className={`${styles.sliderGlider} ${
                  gliderAnimated ? styles.sliderGliderAnimated : ""
                }`}
                style={{
                  transform: `translate3d(${gliderPos.left}px, 0, 0)`,
                  width: `${gliderPos.width}px`,
                }}
                aria-hidden="true"
              />

              {/* Left pearl orb (Homepage anchor) */}
              <Link
                ref={orbRef}
                to="/"
                className={styles.orbLink}
                aria-label="TOEICSpace Trang chủ"
                title="Trang chủ"
              >
                <IconPearlOrb size={26} className={styles.orbIcon} />
              </Link>

              {/* Đăng nhập */}
              <Link
                ref={loginRef}
                to="/login"
                className={`${styles.toggleItem} ${
                  activeAuthPosition === "login" ? styles.toggleItemActive : ""
                }`}
                aria-current={activeAuthPosition === "login" ? "page" : undefined}
              >
                Đăng nhập
              </Link>

              {/* Đăng ký */}
              <Link
                ref={registerRef}
                to="/register"
                className={`${styles.toggleItem} ${
                  activeAuthPosition === "register" ? styles.toggleItemActive : ""
                }`}
                aria-current={activeAuthPosition === "register" ? "page" : undefined}
              >
                Đăng ký
              </Link>
            </div>
          ) : (
            /* Authenticated state: User Avatar (shows name in dropdown on click) + Logout Icon */
            <div className={styles.authLoggedIn}>
              <button
                ref={avatarButtonRef}
                type="button"
                className={styles.avatarButton}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label={`Menu tài khoản của ${user.fullName}`}
                title={user.fullName}
              >
                <div className={styles.avatarCircle} aria-hidden="true">
                  <span className={styles.avatarInitials}>{getInitials(user.fullName)}</span>
                  {user.avatarUrl && (
                    <img
                      src={normalizeAvatarUrl(user.avatarUrl) ?? user.avatarUrl}
                      alt={user.fullName}
                      className={styles.avatarImage}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
              </button>

              <button
                type="button"
                className={styles.logoutIconButton}
                onClick={handleLogout}
                disabled={logout.isPending}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <IconLogout size={18} />
              </button>

              {/* Avatar Dropdown Menu */}
              {dropdownOpen && (
                <div ref={dropdownRef} className={styles.dropdownMenu} role="menu">
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownName}>{user.fullName}</div>
                    <div className={styles.dropdownEmail}>{user.email}</div>
                    <span className={styles.dropdownBadge}>{user.role}</span>
                  </div>

                  <div className={styles.dropdownList}>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => go("/profile")}
                    >
                      <IconUserProfile size={16} />
                      <span>Hồ sơ cá nhân</span>
                    </button>

                    {user.role === "User" && (
                      <>
                        <button
                          type="button"
                          className={styles.dropdownItem}
                          role="menuitem"
                          onClick={() => go("/my-courses")}
                        >
                          <IconBook size={16} />
                          <span>Khóa học của tôi</span>
                        </button>
                        <button
                          type="button"
                          className={styles.dropdownItem}
                          role="menuitem"
                          onClick={() => go("/my-classes")}
                        >
                          <IconBook size={16} />
                          <span>Lớp học của tôi</span>
                        </button>
                        <button
                          type="button"
                          className={styles.dropdownItem}
                          role="menuitem"
                          onClick={() => go("/practice/history")}
                        >
                          <IconHistory size={16} />
                          <span>Lịch sử bài làm</span>
                        </button>
                      </>
                    )}

                    {(user.role === "Admin" || user.role === "Teacher") && (
                      <button
                        type="button"
                        className={styles.dropdownItem}
                        role="menuitem"
                        onClick={() => go(user.role === "Admin" ? "/admin" : "/teacher")}
                      >
                        <IconSettings size={16} />
                        <span>
                          {user.role === "Admin" ? "Quản trị hệ thống (CMS)" : "Trang giáo viên"}
                        </span>
                      </button>
                    )}

                    <Link
                      to="/change-password"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconSettings size={16} />
                      <span>Đổi mật khẩu</span>
                    </Link>

                    <div className={styles.dropdownDivider} />

                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={logout.isPending}
                    >
                      <IconLogout size={16} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!user && sessionStatus !== "restoring" && (
            <Link to="/login" className={styles.mobileLogin}>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
