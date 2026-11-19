/**
 * Home "Bản đồ TOEICSpace" (port of StudyChill `homeMapData.js`): five tiles and, for each, the
 * popup content (short description, list of Parts or games, main button). Pure; every `to` is
 * checked against the router by tests/landing-home.test.mjs.
 */
import { canSee, type SiteMapAudience } from "./siteMap.ts";
import type { UserRole } from "@/modules/auth";

export interface HomeMapEntry {
  to: string;
  name: string;
  sub: string;
  /** Longer text of the hover preview. */
  desc?: string;
  /** Part number shown in the badge (Part lists). */
  num?: string;
  /** Highlighted entry (bold + star). */
  hot?: boolean;
  audience?: SiteMapAudience;
}

export type HomeMapArt = "exam" | "listening" | "reading" | "vocabulary" | "game";

export interface HomeMapCard {
  key: string;
  to: string;
  title: string;
  /** One short line under the tile title. */
  sub: string;
  art: HomeMapArt;
  info: {
    desc: string;
    cta: string;
    /** Main button target when it differs from `to`. */
    ctaTo?: string;
    /** "parts" lists show a Part badge; "links" show a dot or a star. */
    kind?: "parts" | "links";
    items?: HomeMapEntry[];
  };
}

const LEVELS = "5 cấp độ, 450+ → 850+";

export const HOME_MAP: readonly HomeMapCard[] = [
  {
    key: "exam",
    to: "/practice/exam",
    title: "Luyện Đề",
    sub: "Đề 200 câu như thi thật",
    art: "exam",
    info: {
      desc: "Đề đủ 200 câu, 120 phút: thi thử bấm giờ hoặc luyện tập từng phần, chấm điểm thang 990 và xem lại từng câu.",
      cta: "Vào phòng luyện đề",
      kind: "links",
      items: [
        {
          to: "/practice/exam",
          name: "Thi thử & luyện tập theo đề",
          sub: "Chọn bộ đề, chọn Part, chọn tốc độ audio",
          desc: "Thi thử như phòng thi máy tính, hoặc luyện tập: kiểm tra đáp án sau từng nhóm câu.",
          hot: true,
        },
        {
          to: "/practice/history",
          name: "Lịch sử làm bài",
          sub: "Điểm, kết quả, bài đang làm dở",
          desc: "Xem lại điểm từng lần nộp, mở bài chữa hoặc làm tiếp bài còn dở.",
          audience: "learner",
        },
      ],
    },
  },
  {
    key: "listening",
    to: "/practice/listening",
    title: "Luyện Nghe",
    sub: "Theo Part 1 – 4",
    art: "listening",
    info: {
      desc: "Luyện chắc từng Part, audio chuẩn, chấm và giải thích từng câu.",
      cta: "Vào Luyện nghe",
      kind: "parts",
      items: [
        {
          to: "/practice/listening?part=1",
          num: "1",
          name: "Mô tả tranh",
          sub: `Part 1 · ${LEVELS}`,
          desc: "Nhìn tranh, nghe bốn câu và chọn câu tả đúng nhất.",
        },
        {
          to: "/practice/listening?part=2",
          num: "2",
          name: "Hỏi & Đáp",
          sub: `Part 2 · ${LEVELS}`,
          desc: "Nghe câu hỏi ngắn, chọn câu đáp lại phù hợp: luyện phản xạ.",
        },
        {
          to: "/practice/listening?part=3",
          num: "3",
          name: "Hội thoại ngắn",
          sub: `Part 3 · ${LEVELS}`,
          desc: "Hội thoại hai, ba người, mỗi đoạn ba câu hỏi.",
        },
        {
          to: "/practice/listening?part=4",
          num: "4",
          name: "Bài nói ngắn",
          sub: `Part 4 · ${LEVELS}`,
          desc: "Thông báo, quảng cáo, tin nhắn thoại: nghe ý chính và chi tiết.",
        },
      ],
    },
  },
  {
    key: "reading",
    to: "/practice/reading",
    title: "Luyện Đọc",
    sub: "Theo Part 5 – 7",
    art: "reading",
    info: {
      desc: "Từ điền câu tới đọc hiểu đoạn dài, mỗi câu có đáp án, dẫn chứng và bản dịch.",
      cta: "Vào Luyện đọc",
      kind: "parts",
      items: [
        {
          to: "/practice/reading?part=5",
          num: "5",
          name: "Hoàn thành câu",
          sub: `Part 5 · ${LEVELS}`,
          desc: "Chọn từ đúng cho chỗ trống: từ loại, ngữ pháp, từ vựng.",
        },
        {
          to: "/practice/reading?part=6",
          num: "6",
          name: "Điền đoạn văn",
          sub: `Part 6 · ${LEVELS}`,
          desc: "Điền từ và câu vào đoạn văn theo mạch ý.",
        },
        {
          to: "/practice/reading?part=7",
          num: "7",
          name: "Đọc hiểu",
          sub: "Part 7 · Luyện từ đề thi thật",
          desc: "Email, thông báo, bài báo: một hoặc nhiều đoạn, tìm ý và chi tiết.",
        },
      ],
    },
  },
  {
    key: "vocabulary",
    to: "/vocabulary",
    title: "Từ Vựng",
    sub: "Từ vựng & ngữ pháp",
    art: "vocabulary",
    info: {
      desc: "Học từ theo 5 chặng dải điểm TOEIC, ôn lại đúng lúc sắp quên, kèm lộ trình ngữ pháp.",
      cta: "Mở lộ trình từ vựng",
      kind: "links",
      items: [
        {
          to: "/vocabulary",
          name: "Lộ trình từ vựng",
          sub: "5 chặng theo dải điểm TOEIC",
          desc: "Flashcard, trắc nghiệm và ôn theo lịch, chặng nào xong chặng đó.",
          hot: true,
        },
        {
          to: "/vocabulary?view=library",
          name: "Từ vựng của tôi",
          sub: "Từ đã lưu, thư mục, từ hay sai",
          desc: "Mọi từ bạn đã lưu khi học, chia thư mục và nhóm từ hay sai để ôn riêng.",
          audience: "learner",
        },
        {
          to: "/games/grammar",
          name: "Lộ trình ngữ pháp",
          sub: "Ngữ pháp TOEIC theo chặng",
          desc: "Từ thì, từ loại tới mệnh đề: học theo chặng, có bài tập sau mỗi bài.",
        },
      ],
    },
  },
  {
    key: "game",
    to: "/games/dictation",
    title: "Game",
    sub: "Nghe chép, video, báo",
    art: "game",
    info: {
      desc: "Chơi vài phút mỗi ngày để tai quen tiếng Anh và đọc nhanh hơn.",
      cta: "Chơi Nghe chép",
      kind: "links",
      items: [
        {
          to: "/games/dictation",
          name: "Nghe chép chính tả",
          sub: "Chép từng câu, chấm từng từ",
          desc: "Nghe một câu, gõ lại từng từ; sai chỗ nào sáng chỗ đó, có lộ trình theo chặng điểm.",
          hot: true,
        },
        {
          to: "/games/video",
          name: "Video song ngữ",
          sub: "Phụ đề Anh – Việt theo lời",
          desc: "Xem video theo chủ đề, phụ đề chạy theo lời, chạm từ là tra.",
          hot: true,
        },
        {
          to: "/games/news",
          name: "Đọc báo song ngữ",
          sub: "Báo thật, dịch từng câu",
          desc: "Bài báo tiếng Anh theo chủ đề, bản dịch song song và nghe đọc.",
        },
      ],
    },
  },
];

/** Entries of a card the viewer can open (learner-only ones hidden for guests and staff). */
export const entriesFor = (card: HomeMapCard, role: UserRole | null): HomeMapEntry[] =>
  (card.info.items ?? []).filter((item) => canSee(item.audience, role));

/** Every link of the home map (tiles, buttons and list entries). */
export const homeMapLinks = (): string[] =>
  HOME_MAP.flatMap((card) => [
    card.to,
    card.info.ctaTo ?? card.to,
    ...(card.info.items ?? []).map((item) => item.to),
  ]);
