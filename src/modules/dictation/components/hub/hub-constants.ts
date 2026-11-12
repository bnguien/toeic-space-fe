import {
  Award,
  BookOpen,
  Bus,
  Calculator,
  CloudSun,
  Cpu,
  Crown,
  Flag,
  Flame,
  Folder,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  HeartPulse,
  House,
  KeyRound,
  Mail,
  Medal,
  Megaphone,
  Network,
  PartyPopper,
  Presentation,
  Route,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

export type HubTab = "roadmap" | "topics" | "warmup";
export type TopicFilter = "all" | "dailyLife" | "work";

export interface HubCategory {
  key: HubTab;
  title: string;
  note: string;
  icon: LucideIcon;
  /** Counted noun of the results line ("5 chặng · …"). */
  label: string;
}

export const HUB_CATEGORIES: HubCategory[] = [
  {
    key: "roadmap",
    title: "Lộ trình TOEIC",
    note: "5 chặng từ 250+ đến 990",
    icon: Route,
    label: "chặng",
  },
  {
    key: "topics",
    title: "Các bộ Chủ đề",
    note: "22 chủ đề đời sống & công sở",
    icon: BookOpen,
    label: "chủ đề",
  },
  {
    key: "warmup",
    title: "Khởi động & Điền từ",
    note: "25 đoạn văn hệ thống cũ",
    icon: Sparkles,
    label: "bài",
  },
];

/**
 * Pack icon by its lucide name. Same set as Studychill: a pack whose icon is not listed here shows the
 * headphones fallback, exactly as on Studychill.
 */
export const TOPIC_ICONS: Record<string, LucideIcon> = {
  Globe,
  UtensilsCrossed,
  ShoppingCart,
  HeartPulse,
  Home: House,
  CloudSun,
  Bus,
  Heart,
  Smile,
  PartyPopper,
  Folder,
  Mail,
  Presentation,
  Users,
  Megaphone,
  Handshake,
  Cpu,
  Calculator,
  Wallet,
  Network,
  GraduationCap,
  KeyRound,
  Star,
  TrendingUp,
  Medal,
  Flame,
  Crown,
  Flag,
  Target,
  Award,
  Sparkles,
};

/** Tone of each roadmap stage (A1 → C1), deeper towards the goal: [main, soft tint]. */
export const ROADMAP_TONES: { main: string; soft: string }[] = [
  { main: "var(--ui-green)", soft: "var(--ui-green-soft)" },
  { main: "var(--ui-blue)", soft: "var(--ui-blue-soft)" },
  { main: "var(--ui-pearl-text)", soft: "var(--ui-pearl)" },
  { main: "var(--ui-pink)", soft: "var(--ui-pink-soft)" },
  { main: "var(--ui-navy)", soft: "color-mix(in srgb, var(--ui-navy) 12%, var(--ui-surface))" },
];

/** Bar heights (px) of the hero sound wave. */
export const WAVE_BARS = [10, 22, 34, 18, 42, 28, 50, 24, 38, 16, 30, 46, 20, 12];

/** "TOEIC 250+: Nền tảng…" → { score: '250+', subtitle: 'Nền tảng…' }. */
export function splitRoadmapTitle(title: string): { score: string; subtitle: string } {
  const match = title.match(/^TOEIC\s*([\d+]+)\s*:\s*(.+)$/);
  return match ? { score: match[1], subtitle: match[2] } : { score: "", subtitle: title };
}

export const formatNumber = (value: number): string => new Intl.NumberFormat("vi-VN").format(value);

/** Lower case without Vietnamese diacritics, so "du lich" finds "Du lịch". */
export const normalizeSearch = (value: string): string =>
  value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");

/** CSS custom properties for inline `style`. */
export const cssVars = (vars: Record<string, string | number>): CSSProperties =>
  vars as CSSProperties;
