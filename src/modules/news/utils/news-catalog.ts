import type {
  NewsArticle,
  NewsArticleCardDto,
  NewsArticleDetailDto,
  NewsCard,
  NewsLength,
  NewsStage,
  NewsTopic,
} from "../types/news.types";
import { readingProgress } from "./news-storage";

export interface StageInfo {
  key: NewsStage;
  score: string;
  name: string;
  description: string;
}

export interface TopicInfo {
  key: NewsTopic;
  name: string;
  description: string;
}

/** 5 stages by TOEIC score — same milestones and names as the grammar roadmap. */
export const STAGES: StageInfo[] = [
  { key: "c1", score: "250+", name: "Khởi động", description: "Câu ngắn, từ thông dụng hằng ngày" },
  { key: "c2", score: "450+", name: "Phản xạ", description: "Đoạn ngắn, chủ đề quen thuộc" },
  { key: "c3", score: "650+", name: "Tăng tốc", description: "Đúng độ khó TOEIC Part 7" },
  { key: "c4", score: "800+", name: "Bứt phá", description: "Câu dài, nhiều mệnh đề" },
  { key: "c5", score: "990", name: "Về đích", description: "Báo chí nguyên bản" },
];

export const LENGTHS: Array<[NewsLength | "all", string]> = [
  ["all", "Mọi độ dài"],
  ["short", "Dưới 3 phút"],
  ["medium", "3–6 phút"],
  ["long", "Trên 6 phút"],
];

export const TOPICS: TopicInfo[] = [
  {
    key: "business",
    name: "Kinh doanh & công sở",
    description: "Đúng chất TOEIC: họp hành, tuyển dụng, thị trường",
  },
  { key: "technology", name: "Công nghệ", description: "AI, điện thoại, mạng xã hội" },
  {
    key: "lifestyle",
    name: "Đời sống & sức khoẻ",
    description: "Ăn uống, giấc ngủ, thói quen tốt",
  },
  { key: "travel", name: "Du lịch & văn hoá", description: "Điểm đến, lễ hội, ẩm thực thế giới" },
  { key: "environment", name: "Môi trường", description: "Khí hậu, năng lượng xanh, động vật" },
  { key: "education", name: "Giáo dục", description: "Trường học, học ngoại ngữ, kỹ năng" },
];

/** "TOEIC 650+ · Tăng tốc". */
export const stageLabel = (stage: NewsStage | "all"): string => {
  const info = STAGES.find((x) => x.key === stage);
  return info ? `TOEIC ${info.score} · ${info.name}` : "";
};

export const stageScore = (stage: NewsStage): string =>
  STAGES.find((x) => x.key === stage)?.score ?? "";

/** List card; the server's `done` (signed in) wins over the progress kept in this browser. */
export const toNewsCard = (x: NewsArticleCardDto): NewsCard => ({
  slug: x.slug,
  topic: x.topic,
  titleEn: x.titleEn,
  titleVi: x.titleVi || x.titleEn,
  stage: x.stage,
  minutes: x.minutes,
  sourceName: x.sourceName,
  coverUrl: x.coverUrl,
  isNew: x.featured,
  progress: x.done
    ? 100
    : x.readingSeconds != null
      ? x.readingSeconds > 20
        ? 50
        : 0
      : readingProgress(x.slug),
});

export const toNewsArticle = (d: NewsArticleDetailDto): NewsArticle => ({
  slug: d.slug,
  titleEn: d.titleEn,
  titleVi: d.titleVi || d.titleEn,
  summaryVi: d.summaryVi ?? "",
  stage: d.stage,
  topic: d.topic,
  minutes: d.minutes,
  sourceName: d.sourceName,
  sourceUrl: d.sourceUrl,
  author: d.author ?? "",
  publishedAt: d.publishedAt,
  attribution: d.attribution,
  coverUrl: d.coverUrl,
  coverAlt: d.coverAlt ?? "",
  coverCredit: d.coverCredit ?? "",
  coverSourceUrl: d.coverSourceUrl ?? "",
  audioUrl: d.audioUrl ?? "",
  paragraphs: d.paragraphs,
  vocabulary: d.vocabulary,
});
