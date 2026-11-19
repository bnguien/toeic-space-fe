import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpenText,
  FileCheck2,
  Headphones,
  History,
  House,
  Map as MapIcon,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Sun,
} from "lucide-react";

import { IconButton } from "@/shared/components/ui";
import { useColorMode } from "@/shared/hooks/useColorMode";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { WorkspaceLayout } from "@/shared/layouts/WorkspaceLayout";
import { openSiteMap } from "@/shared/utils/site-map-events";

import { usePracticePrefs } from "../../hooks/usePracticePrefs";
import { FONT_SCALES } from "../../store/practicePrefs.store";
import type { PracticeSpaceMode } from "../../types/practice-exam.types";
import styles from "./SpaceShell.module.css";
import { MODE_TONE, toneStyle, type SpaceTone } from "./spaceTones";

export interface SpaceItem {
  id: string;
  /** Short number shown in the chip ("01", "3"). */
  num: string;
  label: ReactNode;
  /** Plain name for the rail tooltip and screen readers. */
  name: string;
  meta?: ReactNode;
  /** 0..1, thin bar under the row; omitted = no bar. */
  progress?: number;
  selected?: boolean;
  tone: SpaceTone;
  onSelect: () => void;
}

export interface SpaceGroup {
  id: string;
  title?: string;
  items: SpaceItem[];
}

const SPACE_MODES: readonly {
  id: PracticeSpaceMode;
  label: string;
  /** Phone strip label. */
  short: string;
  to: string;
  icon: typeof FileCheck2;
}[] = [
  { id: "exam", label: "Luyện Đề", short: "Đề", to: "/practice/exam", icon: FileCheck2 },
  {
    id: "listening",
    label: "Luyện Nghe",
    short: "Nghe",
    to: "/practice/listening",
    icon: Headphones,
  },
  { id: "reading", label: "Luyện Đọc", short: "Đọc", to: "/practice/reading", icon: BookOpenText },
  { id: "history", label: "Lịch sử", short: "Lịch sử", to: "/practice/history", icon: History },
];

const STACKED_QUERY = "(max-width: 960px)";

interface SpaceShellProps {
  mode: PracticeSpaceMode;
  groups: SpaceGroup[];
  /** Opens the "Phân tích" drawer (toolbar shortcut). */
  onStats?: () => void;
  children: ReactNode;
}

/**
 * Frame of the practice space (StudyChill StudySpace): no navbar, a right sidebar with the mode
 * switch, the item list and a toolbar (A−/A+, light/dark, home, collapse). Resizing, the rail and
 * the ≤960px top strip come from the shared WorkspaceLayout; preferences live in practicePrefs.
 */
export function SpaceShell({ mode, groups, onStats, children }: SpaceShellProps) {
  const prefs = usePracticePrefs((s) => ({
    width: s.sidebarWidth,
    collapsed: s.sidebarCollapsed,
    fontScale: s.fontScale,
    setWidth: s.setSidebarWidth,
    setCollapsed: s.setSidebarCollapsed,
    stepFont: s.stepFontScale,
  }));
  const stacked = useMediaQuery(STACKED_QUERY);
  const collapsed = prefs.collapsed && !stacked;
  const { mode: colorMode, toggle } = useColorMode();
  const scaleIndex = FONT_SCALES.indexOf(prefs.fontScale as (typeof FONT_SCALES)[number]);
  const items = groups.flatMap((group) => group.items);

  const tools = (
    <div className={styles.tools}>
      {!collapsed && (
        <>
          <IconButton label="Bản đồ" size="sm" onClick={openSiteMap} aria-haspopup="dialog">
            <MapIcon size={16} />
          </IconButton>
          {onStats && (
            <IconButton label="Phân tích" size="sm" onClick={onStats}>
              <BarChart3 size={16} />
            </IconButton>
          )}
          <IconButton
            label="Chữ nhỏ hơn"
            size="sm"
            disabled={scaleIndex === 0}
            onClick={() => prefs.stepFont(-1)}
          >
            <span className={styles.glyph}>A−</span>
          </IconButton>
          <IconButton
            label="Chữ to hơn"
            size="sm"
            disabled={scaleIndex === FONT_SCALES.length - 1}
            onClick={() => prefs.stepFont(1)}
          >
            <span className={styles.glyph}>A+</span>
          </IconButton>
          <IconButton
            label={colorMode === "dark" ? "Chế độ sáng" : "Chế độ tối"}
            size="sm"
            onClick={toggle}
          >
            {colorMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </IconButton>
          <Link to="/" className={styles.home} aria-label="Về trang chủ" title="Về trang chủ">
            <House size={16} />
          </Link>
        </>
      )}
      <IconButton
        label={collapsed ? "Mở thanh bên" : "Thu gọn thanh bên"}
        size="sm"
        variant={collapsed ? "outline" : "ghost"}
        className={styles.collapse}
        onClick={() => prefs.setCollapsed(!collapsed)}
      >
        {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
      </IconButton>
    </div>
  );

  const modeLinks = (rail: boolean) =>
    SPACE_MODES.map((m) => {
      const Icon = m.icon;
      const on = m.id === mode;
      return (
        <Link
          key={m.id}
          to={m.to}
          className={styles.mode}
          style={toneStyle(MODE_TONE[m.id])}
          data-on={on || undefined}
          aria-current={on ? "page" : undefined}
          title={m.label}
          aria-label={rail ? m.label : undefined}
        >
          <Icon size={17} strokeWidth={2.3} aria-hidden="true" />
          {!rail && (
            <>
              <span className={styles.modeLabel}>{m.label}</span>
              <span className={styles.modeShort}>{m.short}</span>
            </>
          )}
        </Link>
      );
    });

  const sidebar = (
    <div className={styles.panel}>
      <nav className={styles.modes} aria-label="Chế độ luyện tập">
        {modeLinks(false)}
      </nav>
      <div className={styles.list}>
        {groups.map((group) => (
          <section key={group.id} className={styles.group} aria-label={group.title ?? undefined}>
            {group.title && <h2 className={styles.groupTitle}>{group.title}</h2>}
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </section>
        ))}
      </div>
      {tools}
    </div>
  );

  const rail = (
    <nav className={styles.rail} aria-label="Điều hướng luyện tập">
      <div className={styles.railModes}>{modeLinks(true)}</div>
      {items.length > 0 && <span className={styles.railRule} aria-hidden="true" />}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.railItem}
          style={toneStyle(item.tone)}
          data-selected={item.selected || undefined}
          aria-pressed={Boolean(item.selected)}
          title={item.name}
          aria-label={item.name}
          onClick={item.onSelect}
        >
          {item.num}
        </button>
      ))}
      <div className={styles.railTools}>{tools}</div>
    </nav>
  );

  return (
    <div className={styles.shell} style={{ "--nav-height": "0px" } as CSSProperties}>
      <WorkspaceLayout
        sidebar={sidebar}
        rail={rail}
        collapsed={collapsed}
        sidebarWidth={prefs.width}
        onSidebarResize={prefs.setWidth}
        onCollapse={() => prefs.setCollapsed(true)}
        fontScale={prefs.fontScale}
      >
        {children}
      </WorkspaceLayout>
    </div>
  );
}

function ItemRow({ item }: { item: SpaceItem }) {
  return (
    <button
      type="button"
      className={styles.row}
      style={toneStyle(item.tone)}
      data-selected={item.selected || undefined}
      aria-pressed={Boolean(item.selected)}
      title={item.name}
      onClick={item.onSelect}
    >
      <span className={styles.num}>{item.num}</span>
      <span className={styles.label}>{item.label}</span>
      {item.meta !== undefined && <span className={styles.meta}>{item.meta}</span>}
      {item.progress !== undefined && (
        <span
          className={styles.bar}
          aria-hidden="true"
          style={{ "--row-progress": `${Math.round(item.progress * 100)}%` } as CSSProperties}
        />
      )}
    </button>
  );
}
