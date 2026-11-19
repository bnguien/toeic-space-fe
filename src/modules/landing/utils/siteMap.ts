/**
 * Site map of TOEIC Space ("Bản đồ", port of StudyChill `siteMap.js`): every learner-facing page,
 * grouped, with who can see it. Plain data + pure helpers (no icons, no React), so Node tests load
 * it directly; the panel maps `icon` names to lucide icons. Every `to` must match a registered
 * route (checked by tests/site-map-render.test.mjs against the real router).
 */
import type { UserRole } from "@/modules/auth";

/** Who sees an item. */
export type SiteMapAudience = "all" | "guest" | "signedIn" | "learner" | "teacher" | "admin";

export type SiteMapIcon =
  | "exam"
  | "listening"
  | "reading"
  | "history"
  | "sets"
  | "dictation"
  | "video"
  | "news"
  | "vocabulary"
  | "library"
  | "grammar"
  | "courses"
  | "myCourses"
  | "classes"
  | "profile"
  | "password"
  | "login"
  | "register"
  | "admin"
  | "teacher"
  | "home";

export interface SiteMapItem {
  key: string;
  to: string;
  title: string;
  description: string;
  icon: SiteMapIcon;
  audience?: SiteMapAudience;
  /** Short highlight label ("Mới"). */
  tag?: string;
}

export interface SiteMapGroup {
  key: string;
  title: string;
  icon: SiteMapIcon;
  items: SiteMapItem[];
}

export const SITE_MAP: readonly SiteMapGroup[] = [
  {
    key: "practice",
    title: "Luyện thi TOEIC",
    icon: "exam",
    items: [
      {
        key: "exam",
        to: "/practice/exam",
        title: "Luyện đề",
        description: "Thi thử 200 câu như phòng thi thật, chấm điểm thang 990",
        icon: "exam",
        tag: "Mới",
      },
      {
        key: "listening",
        to: "/practice/listening",
        title: "Luyện nghe theo Part",
        description: "Part 1–4 theo cấp độ 450+ → 850+, luyện riêng từng Part trong đề",
        icon: "listening",
        tag: "Mới",
      },
      {
        key: "reading",
        to: "/practice/reading",
        title: "Luyện đọc theo Part",
        description: "Part 5–7 có giải thích, dẫn chứng và bản dịch",
        icon: "reading",
        tag: "Mới",
      },
      {
        key: "history",
        to: "/practice/history",
        title: "Lịch sử làm bài",
        description: "Điểm, kết quả và bài đang làm dở",
        icon: "history",
        audience: "learner",
      },
      {
        key: "sets",
        to: "/practice/parts",
        title: "Bộ luyện tập",
        description: "Tìm bộ luyện theo Part, chủ đề hoặc cấp độ",
        icon: "sets",
      },
    ],
  },
  {
    key: "skills",
    title: "Nghe & đọc mở rộng",
    icon: "listening",
    items: [
      {
        key: "dictation",
        to: "/games/dictation",
        title: "Nghe chép chính tả",
        description: "Chép từng câu, bắt trọn từ khoá, lộ trình theo chặng điểm",
        icon: "dictation",
      },
      {
        key: "video",
        to: "/games/video",
        title: "Video song ngữ",
        description: "Học qua video có phụ đề song ngữ",
        icon: "video",
      },
      {
        key: "news",
        to: "/games/news",
        title: "Đọc báo song ngữ",
        description: "Báo tiếng Anh theo chủ đề, dịch song song",
        icon: "news",
      },
    ],
  },
  {
    key: "words",
    title: "Từ vựng & ngữ pháp",
    icon: "vocabulary",
    items: [
      {
        key: "vocabulary",
        to: "/vocabulary",
        title: "Lộ trình từ vựng",
        description: "5 chặng theo dải điểm TOEIC, flashcard và ôn đúng lúc",
        icon: "vocabulary",
      },
      {
        key: "my-words",
        to: "/vocabulary?view=library",
        title: "Từ vựng của tôi",
        description: "Từ đã lưu, thư mục và từ hay sai",
        icon: "library",
        audience: "learner",
      },
      {
        key: "grammar",
        to: "/games/grammar",
        title: "Lộ trình ngữ pháp",
        description: "Ngữ pháp TOEIC theo chặng, từ nền tảng đến nâng cao",
        icon: "grammar",
      },
    ],
  },
  {
    key: "courses",
    title: "Khoá học & lớp học",
    icon: "courses",
    items: [
      {
        key: "courses",
        to: "/courses",
        title: "Khoá học",
        description: "Khoá học TOEIC theo mục tiêu điểm",
        icon: "courses",
      },
      {
        key: "my-courses",
        to: "/my-courses",
        title: "Khoá học của tôi",
        description: "Học tiếp các khoá đã đăng ký",
        icon: "myCourses",
        audience: "learner",
      },
      {
        key: "my-classes",
        to: "/my-classes",
        title: "Lớp học của tôi",
        description: "Lịch học, buổi học và bài tập của lớp",
        icon: "classes",
        audience: "learner",
      },
    ],
  },
  {
    key: "account",
    title: "Tài khoản",
    icon: "profile",
    items: [
      {
        key: "login",
        to: "/login",
        title: "Đăng nhập",
        description: "Lưu tiến độ, điểm và từ vựng của bạn",
        icon: "login",
        audience: "guest",
      },
      {
        key: "register",
        to: "/register",
        title: "Đăng ký",
        description: "Tạo tài khoản học viên miễn phí",
        icon: "register",
        audience: "guest",
      },
      {
        key: "profile",
        to: "/profile",
        title: "Hồ sơ cá nhân",
        description: "Thông tin, ảnh đại diện, mục tiêu",
        icon: "profile",
        audience: "signedIn",
      },
      {
        key: "password",
        to: "/change-password",
        title: "Đổi mật khẩu",
        description: "Bảo mật tài khoản",
        icon: "password",
        audience: "signedIn",
      },
      {
        key: "teacher",
        to: "/teacher",
        title: "Trang giáo viên",
        description: "Lớp học, lịch dạy, bộ luyện tập",
        icon: "teacher",
        audience: "teacher",
      },
      {
        key: "admin",
        to: "/admin",
        title: "Quản trị hệ thống",
        description: "Người dùng, khoá học, ngân hàng đề",
        icon: "admin",
        audience: "admin",
      },
    ],
  },
];

/** Groups shown as the two columns of the "Bản đồ" panel (the main entries row covers the rest). */
export const PANEL_GROUP_KEYS: readonly string[] = ["skills", "words"];

/** Big entries under the groups (StudyChill "lối vào chính"). */
export const SITE_MAP_MAIN: readonly { to: string; title: string; subtitle: string }[] = [
  { to: "/practice/exam", title: "Luyện đề", subtitle: "Đề TOEIC đầy đủ" },
  { to: "/practice/listening", title: "Luyện nghe", subtitle: "Theo Part 1 – 4" },
  { to: "/practice/reading", title: "Luyện đọc", subtitle: "Theo Part 5 – 7" },
  { to: "/vocabulary", title: "Từ vựng", subtitle: "Lộ trình 5 chặng" },
];

/** Whether a viewer with `role` (null = guest) sees an item. */
export function canSee(audience: SiteMapAudience | undefined, role: UserRole | null): boolean {
  switch (audience ?? "all") {
    case "guest":
      return role === null;
    case "signedIn":
      return role !== null;
    case "learner":
      return role === "User";
    case "teacher":
      return role === "Teacher";
    case "admin":
      return role === "Admin";
    default:
      return true;
  }
}

/** Groups and items a viewer can see; empty groups are dropped. */
export function visibleGroups(
  groups: readonly SiteMapGroup[],
  role: UserRole | null,
): SiteMapGroup[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((i) => canSee(i.audience, role)) }))
    .filter((group) => group.items.length > 0);
}

/** Lower case without Vietnamese diacritics, so "nghe chep" finds "Nghe chép chính tả". */
export const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();

/** Items whose title or description contain every search word; empty groups are dropped. */
export function filterGroups(groups: readonly SiteMapGroup[], query: string): SiteMapGroup[] {
  const terms = stripDiacritics(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...groups];
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const haystack = stripDiacritics(`${item.title} ${item.description} ${group.title}`);
        return terms.every((term) => haystack.includes(term));
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export const countItems = (groups: readonly SiteMapGroup[]) =>
  groups.reduce((sum, group) => sum + group.items.length, 0);

/**
 * Item of the current page: the longest path that is the page or one of its parents; an item with
 * a query (e.g. `?view=library`) matches only when the page has the same parameters, and an item
 * without one is not current while such a sibling matches.
 */
export function currentItem(
  groups: readonly SiteMapGroup[],
  pathname: string,
  search = "",
): SiteMapItem | null {
  const params = new URLSearchParams(search);
  let best: { item: SiteMapItem; score: number } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const [path, query = ""] = item.to.split("?");
      const onPath = pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
      if (!onPath) continue;
      const wanted = [...new URLSearchParams(query).entries()];
      if (!wanted.every(([key, value]) => params.get(key) === value)) continue;
      const score = path.length * 10 + wanted.length;
      if (!best || score > best.score) best = { item, score };
    }
  }
  return best?.item ?? null;
}

/** Path part of an item link (without the query). */
export const pathOf = (to: string) => to.split("?")[0];
