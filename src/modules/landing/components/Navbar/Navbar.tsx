import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout, useSessionStatus } from "@/modules/auth";
import {
  IconBook,
  IconChevronDown,
  IconHistory,
  IconLogout,
  IconPearlOrb,
  IconRoadmap,
  IconSettings,
} from "../icons/LandingIcons";
import { User as IconUserProfile } from "lucide-react";
import mascotLogo from "@/assets/mascot/oy2-hello.png";
import { normalizeAvatarUrl } from "@/modules/profile";
import { LANDING_NAV_ITEMS } from "../../constants";
import styles from "./Navbar.module.css";

interface NavbarProps {
  onNavClick?: (targetId: string) => void;
}

const getInitials = (name: string) => {
  if (!name) return "TS";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Navbar = ({ onNavClick }: NavbarProps) => {
  const user = useCurrentUser();
  const sessionStatus = useSessionStatus();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [openNavKey, setOpenNavKey] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);

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
  const navContainerRef = useRef<HTMLElement>(null);
  const navCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavMouseEnter = (label: string) => {
    if (navCloseTimeoutRef.current) {
      clearTimeout(navCloseTimeoutRef.current);
      navCloseTimeoutRef.current = null;
    }
    setOpenNavKey(label);
  };

  const handleNavMouseLeave = () => {
    if (navCloseTimeoutRef.current) {
      clearTimeout(navCloseTimeoutRef.current);
    }
    navCloseTimeoutRef.current = setTimeout(() => {
      setOpenNavKey(null);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navCloseTimeoutRef.current) {
        clearTimeout(navCloseTimeoutRef.current);
      }
    };
  }, []);

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

      // Nav item dropdowns
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setOpenNavKey(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setOpenNavKey(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLinkClick = (targetId: string) => {
    if (navCloseTimeoutRef.current) {
      clearTimeout(navCloseTimeoutRef.current);
    }
    setOpenNavKey(null);
    setMobileMenuOpen(false);
    if (onNavClick) {
      onNavClick(targetId);
    } else {
      let element = document.getElementById(targetId);
      if (!element && targetId === "practice") {
        element = document.getElementById("listening");
      }
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate(targetId === "hero" ? "/" : `/#${targetId}`);
      }
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  const handleDropdownNavigate = (anchor: string) => {
    setDropdownOpen(false);
    const element = document.getElementById(anchor);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className={`${styles.header} ${isScrolledState ? styles.scrolled : ""}`}>
      <div className={styles.navInner}>
        {/* Left: TOEICSpace Clean Brand Logo with Mascot */}
        <a
          href="#hero"
          className={styles.brandLink}
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick("hero");
          }}
          aria-label="TOEICSpace Trang chủ"
        >
          <img src={mascotLogo} alt="TOEICSpace Mascot" className={styles.brandMascotImg} />
          <span className={styles.brandText}>TOEICSpace</span>
        </a>

        {/* Center: Balanced Navigation Links with Dropdown Menus */}
        <nav ref={navContainerRef} className={styles.centerNav} aria-label="Điều hướng chính">
          {LANDING_NAV_ITEMS.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isOpen = openNavKey === item.label;

            return (
              <div
                key={item.label}
                className={styles.navItemWrapper}
                onMouseEnter={() => hasChildren && handleNavMouseEnter(item.label)}
                onMouseLeave={handleNavMouseLeave}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    className={`${styles.navButton} ${isOpen ? styles.navButtonActive : ""}`}
                    onClick={() => setOpenNavKey(isOpen ? null : item.label)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                  >
                    <span>{item.label}</span>
                    <span
                      className={`${styles.navChevron} ${isOpen ? styles.navChevronRotated : ""}`}
                    >
                      <IconChevronDown size={13} />
                    </span>
                  </button>
                ) : (
                  <a
                    href={item.href}
                    className={styles.navLink}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(item.targetId);
                    }}
                  >
                    {item.label}
                  </a>
                )}

                {/* Submenu Dropdown */}
                {hasChildren && isOpen && (
                  <div className={styles.navDropdown} role="menu">
                    {item.children?.map((sub) => (
                      <button
                        key={sub.label}
                        type="button"
                        className={styles.navDropdownItem}
                        role="menuitem"
                        onClick={() => handleLinkClick(sub.targetId)}
                      >
                        <span className={styles.navDropdownTitle}>{sub.label}</span>
                        {sub.description && (
                          <span className={styles.navDropdownDesc}>{sub.description}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right: Authentication Actions */}
        <div className={styles.authGroup}>
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
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/profile");
                      }}
                    >
                      <IconUserProfile size={16} />
                      <span>Hồ sơ cá nhân</span>
                    </button>

                    <button
                      type="button"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => handleDropdownNavigate("roadmap")}
                    >
                      <IconRoadmap size={16} />
                      <span>Lộ trình cá nhân</span>
                    </button>

                    <button
                      type="button"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => handleDropdownNavigate("courses")}
                    >
                      <IconBook size={16} />
                      <span>Khóa học của tôi</span>
                    </button>

                    <button
                      type="button"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => handleDropdownNavigate("practice")}
                    >
                      <IconHistory size={16} />
                      <span>Lịch sử bài làm</span>
                    </button>

                    <button
                      type="button"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => {
                        setDropdownOpen(false);
                        if (user.role === "Admin" || user.role === "Teacher") {
                          navigate("/admin");
                        } else {
                          handleDropdownNavigate("roadmap");
                        }
                      }}
                    >
                      <IconSettings size={16} />
                      <span>
                        {user.role === "Admin" || user.role === "Teacher"
                          ? "Quản trị hệ thống (CMS)"
                          : "Cài đặt"}
                      </span>
                    </button>

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

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Mở menu di động"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOpen}>
          {LANDING_NAV_ITEMS.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isGroupOpen = openMobileGroup === item.label;

            if (!hasChildren) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={styles.mobileNavLink}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(item.targetId);
                  }}
                >
                  {item.label}
                </a>
              );
            }

            return (
              <div key={item.label} className={styles.mobileNavGroup}>
                <button
                  type="button"
                  className={styles.mobileNavLink}
                  onClick={() => setOpenMobileGroup(isGroupOpen ? null : item.label)}
                >
                  <span>{item.label}</span>
                  <span
                    className={`${styles.navChevron} ${
                      isGroupOpen ? styles.navChevronRotated : ""
                    }`}
                  >
                    <IconChevronDown size={14} />
                  </span>
                </button>

                {isGroupOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {item.children?.map((sub) => (
                      <button
                        key={sub.label}
                        type="button"
                        className={styles.mobileNavSubLink}
                        onClick={() => handleLinkClick(sub.targetId)}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {!user ? (
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <Link
                to="/login"
                className={`${styles.toggleItem} ${
                  activeAuthPosition === "login" ? styles.toggleItemActive : ""
                }`}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: activeAuthPosition === "login" ? undefined : "#f1f5f9",
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className={`${styles.toggleItem} ${
                  activeAuthPosition === "register" ? styles.toggleItemActive : ""
                }`}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: activeAuthPosition === "register" ? undefined : "#f1f5f9",
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Đăng ký
              </Link>
            </div>
          ) : (
            <div
              style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/profile");
                }}
              >
                <IconUserProfile size={16} /> Hồ sơ cá nhân
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDropdownNavigate("roadmap");
                }}
              >
                <IconRoadmap size={16} /> Lộ trình cá nhân
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDropdownNavigate("courses");
                }}
              >
                <IconBook size={16} /> Khóa học của tôi
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDropdownNavigate("practice");
                }}
              >
                <IconHistory size={16} /> Lịch sử bài làm
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (user.role === "Admin" || user.role === "Teacher") {
                    navigate("/admin");
                  }
                }}
              >
                <IconSettings size={16} /> Cài đặt {user.role !== "User" && "(CMS)"}
              </button>
              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
                onClick={handleLogout}
              >
                <IconLogout size={16} /> Đăng xuất ({user.fullName})
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
