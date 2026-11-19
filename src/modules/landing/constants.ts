import type { FeatureCardItem } from "./types";

/** Dots of the left rail: the home page sections, top to bottom. */
export const SECTION_NAV_DOTS = [
  { id: "hero", label: "Trang chủ" },
  { id: "ban-do", label: "01. Bản đồ TOEICSpace" },
  { id: "ngu-phap", label: "02. Lộ trình ngữ pháp" },
  { id: "khoa-hoc", label: "03. Khoá học nổi bật" },
];

/** Cards of the hero's second slide: each opens a page (`route`) or a home section (`targetId`). */
export const MAIN_FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: "listening",
    icon: "listening",
    title: "Luyện Listening",
    subtitle: "Part 1–4 theo từng dạng",
    route: "/practice/listening",
  },
  {
    id: "reading",
    icon: "reading",
    title: "Luyện Reading",
    subtitle: "Part 5–7 có giải thích",
    route: "/practice/reading",
  },
  {
    id: "roadmap",
    icon: "roadmap",
    title: "Lộ trình ngữ pháp",
    subtitle: "5 chặng, từ mất gốc đến 990",
    targetId: "ngu-phap",
  },
  {
    id: "ai",
    icon: "ai",
    title: "Từ vựng TOEIC",
    subtitle: "Flashcard & ôn đúng lúc",
    route: "/vocabulary",
  },
];
