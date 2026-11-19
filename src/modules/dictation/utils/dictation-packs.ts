/**
 * Catalog of dictation packs: groups + display data of every pack (title, description, icon, counts).
 * Courses and sentences live on the server: TOEIC roadmap packs → /dictation/roadmap, topic packs →
 * /dictation/courses?pack=<slug>; sentences are played through the play page (server grading).
 * Slugs are the English pack keys stored in the Content database (see data/dictation/).
 */

export type PackCategoryKey = "roadmap" | "dailyLife" | "work" | "warmup";

export interface PackCategory {
  title: string;
  subtitle: string;
  slugs: string[];
}

export interface DictationPack {
  slug: string;
  title: string;
  courseCount: number;
  sentenceCount: number;
  description: string;
  /** lucide-react icon name. */
  icon: string;
  levelBadge: string;
  difficulty: string;
  cefr: string;
}

export const PACK_CATEGORIES: Record<PackCategoryKey, PackCategory> = {
  roadmap: {
    title: "Lộ trình TOEIC 0-990",
    subtitle: "5 chặng chuẩn hóa tuần tự từ A1 (250+) đến C1 (990 Master)",
    slugs: ["toeic-250", "toeic-450", "toeic-650", "toeic-800", "toeic-990"],
  },
  dailyLife: {
    title: "Tình huống đời sống",
    subtitle: "10 chủ đề giao tiếp thực tế hàng ngày, du lịch, mua sắm, ẩm thực",
    slugs: [
      "travel",
      "restaurant-food",
      "shopping",
      "health",
      "home-family",
      "weather",
      "transport",
      "dating-relationships",
      "emotions-personality",
      "events-festivals",
    ],
  },
  work: {
    title: "Môi trường công việc",
    subtitle: "12 chủ đề giao tiếp công sở, đàm phán, email, marketing & CNTT",
    slugs: [
      "office",
      "business-email",
      "meetings-presentations",
      "job-interviews",
      "marketing-sales",
      "negotiation",
      "it-technology",
      "finance-accounting",
      "banking-finance",
      "networking",
      "education",
      "housing-rental",
    ],
  },
  warmup: {
    title: "Thử thách Khởi động",
    subtitle: "25 câu ngắn nền tảng tích hợp từ hệ thống cũ, hỗ trợ cả luyện Điền từ",
    slugs: ["quick-warmup"],
  },
};

export const DICTATION_PACKS: Record<string, DictationPack> = {
  "emotions-personality": {
    slug: "emotions-personality",
    title: "Biểu đạt Tâm lý, Cảm xúc & Tính cách",
    courseCount: 27,
    sentenceCount: 794,
    description: "Bộc lộ cảm xúc vui buồn, miêu tả tính cách con người",
    icon: "Smile",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  negotiation: {
    slug: "negotiation",
    title: "Nghệ thuật Đàm phán & Thương lượng Thương mại",
    courseCount: 26,
    sentenceCount: 804,
    description: "Nghệ thuật thương thảo giá, chốt deal, ký kết điều khoản",
    icon: "Handshake",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  travel: {
    slug: "travel",
    title: "Tiếng Anh Du lịch & Trải nghiệm Quốc tế",
    courseCount: 36,
    sentenceCount: 1078,
    description: "Sân bay, khách sạn, đặt tour, xử lý sự cố chuyến đi",
    icon: "Plane",
    levelBadge: "B1",
    difficulty: "Beginner",
    cefr: "A2-B1",
  },
  "business-email": {
    slug: "business-email",
    title: "Thư tín & Email Thương mại Chuyên nghiệp",
    courseCount: 27,
    sentenceCount: 829,
    description: "Viết thư tín chuyên nghiệp, email công việc, thông báo dự án",
    icon: "Mail",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  education: {
    slug: "education",
    title: "Môi trường Học đường, Giảng dạy & Trao đổi Học tập",
    courseCount: 27,
    sentenceCount: 845,
    description: "Trao đổi học thuật, đại học, du học, nghiên cứu và thi cử",
    icon: "GraduationCap",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  transport: {
    slug: "transport",
    title: "Hệ thống Giao thông & Di chuyển Đô thị",
    courseCount: 27,
    sentenceCount: 805,
    description: "Tàu xe, xe buýt, metro, hỏi đường, chỉ dẫn lộ trình đô thị",
    icon: "Car",
    levelBadge: "A2",
    difficulty: "Beginner",
    cefr: "A2",
  },
  "dating-relationships": {
    slug: "dating-relationships",
    title: "Xây dựng Mối quan hệ & Giao tiếp Xã hội",
    courseCount: 26,
    sentenceCount: 802,
    description: "Hẹn hò, làm quen, duy trì mối quan hệ và giao tiếp xã hội",
    icon: "Heart",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  "meetings-presentations": {
    slug: "meetings-presentations",
    title: "Kỹ năng Điều hành Họp & Thuyết trình Dự án",
    courseCount: 27,
    sentenceCount: 833,
    description: "Điều hành cuộc họp, thuyết trình slide, bảo vệ quan điểm",
    icon: "Presentation",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  "it-technology": {
    slug: "it-technology",
    title: "Công nghệ Thông tin, Phần mềm & Xử lý Sự cố IT",
    courseCount: 27,
    sentenceCount: 817,
    description: "Lập trình, bug, deploy hệ thống, hạ tầng đám mây và kỹ thuật",
    icon: "Code",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  "marketing-sales": {
    slug: "marketing-sales",
    title: "Tiếp thị Truyền thông & Bán hàng Chuyên sâu",
    courseCount: 27,
    sentenceCount: 835,
    description: "Chiến dịch marketing, chào hàng, tiếp thị số & chăm sóc khách",
    icon: "Megaphone",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  shopping: {
    slug: "shopping",
    title: "Kỹ năng Mua sắm, Đặt hàng & Dịch vụ Khách hàng",
    courseCount: 26,
    sentenceCount: 758,
    description: "Hỏi giá, thử đồ, mua online, đổi trả hàng & khiếu nại",
    icon: "ShoppingBag",
    levelBadge: "A2",
    difficulty: "Beginner",
    cefr: "A2",
  },
  "housing-rental": {
    slug: "housing-rental",
    title: "Bất động sản, Nhà ở & Hợp đồng Cư trú",
    courseCount: 27,
    sentenceCount: 845,
    description: "Thuê căn hộ, hợp đồng nhà đất, thanh toán tiện ích & môi giới",
    icon: "Building",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  networking: {
    slug: "networking",
    title: "Giao lưu Kết nối & Mở rộng Mạng lưới Đối tác",
    courseCount: 26,
    sentenceCount: 780,
    description: "Kết nối đối tác tại hội nghị, trao danh thiếp, mở rộng quan hệ",
    icon: "Users",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  "banking-finance": {
    slug: "banking-finance",
    title: "Tài chính Cá nhân & Nghiệp vụ Ngân hàng",
    courseCount: 26,
    sentenceCount: 790,
    description: "Mở tài khoản, chuyển tiền quốc tế, thẻ tín dụng & vay vốn",
    icon: "Landmark",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  "home-family": {
    slug: "home-family",
    title: "Đời sống Gia đình & Sinh hoạt Thường nhật",
    courseCount: 27,
    sentenceCount: 806,
    description: "Đồ đạc, việc nhà, sinh hoạt gia đình, trò chuyện hàng ngày",
    icon: "Home",
    levelBadge: "A2",
    difficulty: "Beginner",
    cefr: "A2",
  },
  "restaurant-food": {
    slug: "restaurant-food",
    title: "Văn hóa Ẩm thực & Giao tiếp Nhà hàng",
    courseCount: 24,
    sentenceCount: 725,
    description: "Gọi món, thanh toán, nhận xét món ăn, văn hoá ẩm thực",
    icon: "UtensilsCrossed",
    levelBadge: "A2",
    difficulty: "Beginner",
    cefr: "A2",
  },
  "job-interviews": {
    slug: "job-interviews",
    title: "Kỹ năng Phỏng vấn & Tuyển dụng Việc làm",
    courseCount: 27,
    sentenceCount: 831,
    description: "Trả lời phỏng vấn xin việc, đàm phán lương thưởng, CV",
    icon: "UserCheck",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  "events-festivals": {
    slug: "events-festivals",
    title: "Tổ chức Sự kiện, Lễ hội & Kỷ niệm Đáng nhớ",
    courseCount: 27,
    sentenceCount: 832,
    description: "Tổ chức tiệc, lễ hội, sinh nhật, kỷ niệm đáng nhớ",
    icon: "Sparkles",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  "finance-accounting": {
    slug: "finance-accounting",
    title: "Kế toán Doanh nghiệp, Ngân sách & Hóa đơn",
    courseCount: 26,
    sentenceCount: 817,
    description: "Kế toán doanh nghiệp, bảng cân đối, ngân sách & hoá đơn",
    icon: "Calculator",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  weather: {
    slug: "weather",
    title: "Hiện tượng Tự nhiên, Thời tiết & Môi trường",
    courseCount: 27,
    sentenceCount: 809,
    description: "Nói về thời tiết, bốn mùa, dự báo bão, hiện tượng tự nhiên",
    icon: "CloudSun",
    levelBadge: "A2",
    difficulty: "Beginner",
    cefr: "A2",
  },
  "toeic-250": {
    slug: "toeic-250",
    title: "TOEIC 250+: Nền tảng Tiếng Anh Căn bản & Khởi động",
    courseCount: 100,
    sentenceCount: 2908,
    description: "Nhập môn: chào hỏi, bản thân, thói quen - từng bước vững chắc",
    icon: "Flag",
    levelBadge: "A1",
    difficulty: "Beginner",
    cefr: "A1",
  },
  "toeic-450": {
    slug: "toeic-450",
    title: "TOEIC 450+: Phản xạ Sơ cấp & Tình huống Thực tế",
    courseCount: 90,
    sentenceCount: 2699,
    description: "Củng cố nền tảng: sinh hoạt, mua sắm, đi lại và hỏi đường",
    icon: "Target",
    levelBadge: "A2",
    difficulty: "Beginner",
    cefr: "A2",
  },
  "toeic-650": {
    slug: "toeic-650",
    title: "TOEIC 650+: Giao tiếp Tự nhiên & Cấu trúc Trung cấp",
    courseCount: 79,
    sentenceCount: 2398,
    description: "Diễn đạt trải nghiệm, kế hoạch công việc, ý kiến trọn vẹn",
    icon: "TrendingUp",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  "toeic-800": {
    slug: "toeic-800",
    title: "TOEIC 800+: Tác phong Công sở & Giao dịch Chuyên nghiệp",
    courseCount: 78,
    sentenceCount: 2402,
    description: "Lập luận, thuyết trình dài hơi, câu phức tự nhiên trong công sở",
    icon: "Award",
    levelBadge: "B2",
    difficulty: "Intermediate",
    cefr: "B2",
  },
  "toeic-990": {
    slug: "toeic-990",
    title: "TOEIC 990: Đỉnh cao Ngôn ngữ & Diễn đạt Học thuật",
    courseCount: 57,
    sentenceCount: 1770,
    description: "Lập luận sắc bén, sắc thái ngôn ngữ tinh tế, chủ đề chuyên sâu",
    icon: "Crown",
    levelBadge: "C1",
    difficulty: "Advanced",
    cefr: "C1",
  },
  office: {
    slug: "office",
    title: "Tiếng Anh Môi trường Văn phòng & Doanh nghiệp",
    courseCount: 36,
    sentenceCount: 1096,
    description: "Giao tiếp công sở, trao đổi đồng nghiệp, báo cáo tiến độ",
    icon: "Briefcase",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  health: {
    slug: "health",
    title: "Thuật ngữ Y tế, Thăm khám & Sức khỏe Đời sống",
    courseCount: 27,
    sentenceCount: 815,
    description: "Khám bệnh, tả triệu chứng, mua thuốc, sơ cứu khẩn cấp",
    icon: "HeartPulse",
    levelBadge: "B1",
    difficulty: "Intermediate",
    cefr: "B1",
  },
  "quick-warmup": {
    slug: "quick-warmup",
    title: "Thử thách Khởi động & Luyện Điền từ (Mini Warm-up)",
    courseCount: 5,
    sentenceCount: 25,
    description:
      "25 câu luyện phản xạ nhanh 5 cấp độ từ hệ thống cũ, tối ưu cho cả Nghe chép và Nghe điền từ",
    icon: "Sparkles",
    levelBadge: "ALL",
    difficulty: "Tổng hợp",
    cefr: "A1-C1",
  },
};

/** TOEIC roadmap packs → roadmap level in the database. */
export const ROADMAP_PACK_LEVEL: Record<string, number> = {
  "toeic-250": 1,
  "toeic-450": 2,
  "toeic-650": 3,
  "toeic-800": 4,
  "toeic-990": 5,
};

export const LEVEL_PACK: Record<number, string> = {
  1: "toeic-250",
  2: "toeic-450",
  3: "toeic-650",
  4: "toeic-800",
  5: "toeic-990",
};

// CEFR label of a pack → TOEIC score shown to learners.
const CEFR_TO_TOEIC: Record<string, number> = {
  A1: 250,
  A2: 450,
  B1: 650,
  B2: 800,
  C1: 990,
  C2: 990,
};

export function toeicLabel(
  pack: Pick<DictationPack, "cefr" | "levelBadge"> | null | undefined,
): string {
  const levels = String(pack?.cefr || pack?.levelBadge || "")
    .toUpperCase()
    .split(/[-–]/)
    .map((part) => CEFR_TO_TOEIC[part.trim()])
    .filter(Boolean);
  if (!levels.length) return "";
  const [from, to] = [levels[0], levels[levels.length - 1]];
  if (from === to) return from >= 990 ? "TOEIC 990" : `TOEIC ${from}+`;
  return `TOEIC ${from}–${to}`;
}
