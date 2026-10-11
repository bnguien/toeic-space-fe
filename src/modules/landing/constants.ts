import type {
  CourseItem,
  FeatureCardItem,
  ListeningPartItem,
  NavItem,
  ReadingPartItem,
  RoadmapMilestone,
  VocabularyWord,
} from "./types";

export const LANDING_NAV_ITEMS: NavItem[] = [
  {
    label: "Luyện thi",
    href: "#practice",
    targetId: "practice",
    children: [
      {
        label: "Luyện đề online",
        targetId: "practice",
        path: "/practice/exam",
      },
      {
        label: "Luyện theo Part",
        targetId: "reading",
        path: "/practice/parts",
      },
    ],
  },
  {
    label: "Flashcards",
    href: "#vocabulary",
    targetId: "vocabulary",
  },
  {
    label: "Khóa học",
    href: "#courses",
    targetId: "courses",
  },
  {
    label: "Về TOEICSpace",
    href: "#about",
    targetId: "about",
    children: [
      {
        label: "Giới thiệu nền tảng",
        description: "Triết lý học tập tĩnh lặng cùng Oysteic",
        targetId: "about",
        path: "/about",
      },
      {
        label: "Hệ sinh thái",
        description: "Mạng lưới đối tác & 50.000+ học viên",
        targetId: "ecosystem",
        path: "/ecosystem",
      },
      {
        label: "Liên hệ",
        description: "Kênh giải đáp & hỗ trợ 24/7",
        targetId: "about",
        path: "/contact",
      },
    ],
  },
];

export const SECTION_NAV_DOTS = [
  { id: "hero", label: "Trang chủ" },
  { id: "listening", label: "01. Luyện Listening" },
  { id: "reading", label: "02. Luyện Reading" },
  { id: "roadmap", label: "03. Lộ trình cá nhân" },
  { id: "vocabulary", label: "04. Từ vựng AI" },
  { id: "courses", label: "05. Khóa học" },
  { id: "ecosystem", label: "06. Hệ sinh thái" },
];

export const MAIN_FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: "listening",
    icon: "listening",
    title: "Luyện Listening",
    subtitle: "Part 1–4 theo từng dạng",
    targetId: "listening",
  },
  {
    id: "reading",
    icon: "reading",
    title: "Luyện Reading",
    subtitle: "Part 5–7 có giải thích",
    targetId: "reading",
  },
  {
    id: "roadmap",
    icon: "roadmap",
    title: "Lộ trình riêng",
    subtitle: "Đặt mục tiêu, có kế hoạch",
    targetId: "roadmap",
  },
  {
    id: "ai",
    icon: "ai",
    title: "Từ vựng cùng AI",
    subtitle: "Flashcard & trắc nghiệm",
    targetId: "vocabulary",
  },
];

export const LISTENING_PARTS: ListeningPartItem[] = [
  {
    partNumber: 1,
    partName: "PART 1",
    title: "Mô tả tranh",
    description: "Nghe & chọn tranh đúng",
    questionCount: 6,
    sampleTranscript:
      "(A) The man is repairing a photocopier.\n(B) The woman is presenting slides to colleagues.\n(C) Papers are scattered across the meeting table.\n(D) A whiteboard is mounted on the conference wall.",
  },
  {
    partNumber: 2,
    partName: "PART 2",
    title: "Hỏi – đáp",
    description: "Phản xạ câu hỏi ngắn",
    questionCount: 25,
    sampleTranscript:
      "Question: Where did you leave the contract files?\n(A) In the cabinet on the second floor.\n(B) Yes, I signed it yesterday morning.\n(C) At about three thirty PM.",
  },
  {
    partNumber: 3,
    partName: "PART 3",
    title: "Hội thoại",
    description: "Nghe hội thoại 2–3 người",
    questionCount: 39,
    sampleTranscript:
      "Speaker A: Hi Jessica, did you finish review of the Q3 sales report?\nSpeaker B: Almost done, Mark. I am just verifying the European division's numbers.\nSpeaker A: Great, let's present it at the senior executive meeting on Friday.",
  },
  {
    partNumber: 4,
    partName: "PART 4",
    title: "Bài nói ngắn",
    description: "Thông báo, bản tin",
    questionCount: 30,
    sampleTranscript:
      "Attention all passengers for Flight 408 to Tokyo Haneda. Due to maintenance checks, departure has been rescheduled to Gate 14B at 10:45 AM. We apologize for any inconvenience.",
  },
];

export const READING_PARTS: ReadingPartItem[] = [
  {
    id: "part-5",
    part: "PART 5",
    title: "Hoàn thành câu",
    subtitle: "Part 5 · 30 câu · Ngữ pháp & từ loại",
    questionLabel: "PART 5 · CÂU 14",
    questionText: "The marketing team will ______ the new campaign results at Friday's meeting.",
    options: [
      { key: "A", text: "present" },
      { key: "B", text: "presence" },
      { key: "C", text: "presenting" },
      { key: "D", text: "presentation" },
    ],
    correctOption: "A",
    explanation:
      "Chính xác! Sau trợ động từ khuyết thiếu 'will', ta luôn dùng động từ nguyên mẫu không 'to' (V-bare). 'present' (v) nghĩa là thuyết trình, trình bày kết quả chiến dịch mới.",
  },
  {
    id: "part-6",
    part: "PART 6",
    title: "Hoàn thành đoạn",
    subtitle: "Part 6 · 16 câu · Điền câu vào ngữ cảnh",
    questionLabel: "PART 6 · CÂU 131",
    questionText:
      "Thank you for joining our webinar yesterday. Please find ______ the presentation slides and recording link.",
    options: [
      { key: "A", text: "attached" },
      { key: "B", text: "attachment" },
      { key: "C", text: "attaching" },
      { key: "D", text: "attaches" },
    ],
    correctOption: "A",
    explanation:
      "Chính xác! Cụm từ 'find attached' là cấu trúc thông dụng trong thư tín thương mại TOEIC (mời bạn xem tài liệu được đính kèm bên dưới).",
  },
  {
    id: "part-7",
    part: "PART 7",
    title: "Đọc hiểu",
    subtitle: "Part 7 · 54 câu · Đơn & đa văn bản",
    questionLabel: "PART 7 · CÂU 152",
    questionText:
      "According to the email, why does Mr. Henderson request to reschedule the product launch?",
    options: [
      { key: "A", text: "To allow extra testing for quality assurance" },
      { key: "B", text: "Because the venue is fully booked" },
      { key: "C", text: "Due to unforeseen budget constraints" },
      { key: "D", text: "To invite more international journalists" },
    ],
    correctOption: "A",
    explanation:
      "Chính xác! Đoạn 2 nêu rõ: 'we need an additional week of testing to guarantee product safety before public release'.",
  },
];

export const ROADMAP_MILESTONES: RoadmapMilestone[] = [
  {
    weekLabel: "TUẦN 0",
    title: "Đặt mục tiêu",
    description: "Chọn số điểm & mốc thời gian thi",
    progressPercent: 100,
    icon: "target",
  },
  {
    weekLabel: "TUẦN 1",
    title: "Kiểm tra đầu vào",
    description: "Bài test ngắn xác định điểm hiện tại",
    progressPercent: 65,
    icon: "calendar",
  },
  {
    weekLabel: "TUẦN 2–6",
    title: "Nền tảng nghe - đọc",
    description: "Lịch học theo Part yếu nhất",
    progressPercent: 45,
    icon: "headphones",
  },
  {
    weekLabel: "TUẦN 7–10",
    title: "Full test & về đích",
    description: "Đề đầy đủ, phân tích lỗi sai",
    progressPercent: 20,
    icon: "trophy",
  },
];

export const VOCABULARY_LIST: VocabularyWord[] = [
  {
    word: "Renovate",
    phonetic: "/ˈren.ə.veɪt/",
    type: "verb",
    meaning: "Cải tạo, nâng cấp, tu sửa lại công trình",
    example: "The headquarters will close for two weeks in May to renovate the main auditorium.",
    exampleTranslation:
      "Trụ sở chính sẽ đóng cửa trong 2 tuần vào tháng 5 để tu sửa hội trường lớn.",
    aiTip:
      "Mẹo nhớ cùng Oysteic: 'Re-' = làm lại, 'Nov-' = mới (như novel). Renovate = làm mới lại hoàn toàn!",
  },
  {
    word: "Substantial",
    phonetic: "/səbˈstæn.ʃəl/",
    type: "adjective",
    meaning: "Đáng kể, lớn lao (thường đi với increase/growth)",
    example: "The firm reported a substantial increase in quarterly operating profits.",
    exampleTranslation: "Công ty đã báo cáo mức tăng đáng kể trong lợi nhuận hoạt động hàng quý.",
    aiTip:
      "Mẹo nhớ cùng Oysteic: 'Substance' = chất lượng thực tế. Substantial = có thực chất, rất lớn!",
  },
  {
    word: "Collaborate",
    phonetic: "/kəˈlæb.ə.reɪt/",
    type: "verb",
    meaning: "Hợp tác, làm việc chung",
    example: "Our marketing staff collaborated closely with the design agency.",
    exampleTranslation: "Nhân sự tiếp thị đã hợp tác chặt chẽ cùng đại lý thiết kế.",
    aiTip:
      "Mẹo nhớ cùng Oysteic: 'Co-' = cùng nhau + 'Labor' = lao động. Collaborate = cùng nhau làm việc!",
  },
];

export const FEATURED_COURSES: CourseItem[] = [
  {
    id: "course-450",
    band: "TOEIC 450+",
    title: "Khởi động & Lấy lại nền tảng",
    description: "Dành cho người mất gốc, củng cố ngữ pháp cốt lõi và phát âm chuẩn từng âm tiết.",
    duration: "6 tuần · 36 buổi",
    lessons: 48,
    rating: 4.9,
    reviews: 1240,
    originalPrice: "1.890.000đ",
    price: "1.290.000đ",
    badge: "Mất gốc",
    features: [
      "Ngữ pháp 12 thì & cấu trúc câu TOEIC",
      "Phát âm IPA & phản xạ nghe Part 1-2",
      "1.000 từ vựng cốt lõi thường gặp",
      "Trợ giảng AI giải đáp 24/7",
    ],
  },
  {
    id: "course-650",
    band: "TOEIC 650+",
    title: "Đột phá Band điểm Trung cấp",
    description: "Nắm vững kỹ thuật Skimming/Scanning, phản xạ hội thoại Part 3-4 và bẫy Part 5-6.",
    duration: "8 tuần · 48 buổi",
    lessons: 64,
    rating: 5.0,
    reviews: 3180,
    originalPrice: "2.490.000đ",
    price: "1.790.000đ",
    badge: "Bán chạy nhất",
    features: [
      "Chiến lược quét từ khóa Part 7",
      "Kỹ năng nghe nối âm, nuốt âm Part 3-4",
      "15 đề thi thử bấm giờ có chấm điểm",
      "Kho 3.000 từ vựng thương mại & kinh tế",
    ],
  },
  {
    id: "course-800",
    band: "TOEIC 800+",
    title: "Chinh phục Điểm số Xuất sắc",
    description: "Luyện đề ETS mới nhất, tối ưu thời gian làm bài, thành thạo đoạn văn kép & ba.",
    duration: "10 tuần · 60 buổi",
    lessons: 80,
    rating: 4.95,
    reviews: 860,
    originalPrice: "3.200.000đ",
    price: "2.390.000đ",
    badge: "Mục tiêu cao",
    features: [
      "Trọn bộ ETS 2024–2025 độ khó cao nhất",
      "Phân tích chuyên sâu bẫy từ đồng nghĩa",
      "Luyện tốc độ đọc 100 câu/75 phút",
      "Cam kết tăng tối thiểu 150+ điểm",
    ],
  },
];

export const PARTNER_INSTITUTIONS = [
  { name: "ĐH Bách Khoa", code: "DUT" },
  { name: "ĐH Kinh Tế", code: "DUE" },
  { name: "ĐH Kiến Trúc", code: "UAH" },
  { name: "ĐH Sư Phạm", code: "UED" },
  { name: "ĐH Duy Tân", code: "DTU" },
  { name: "ĐH FPT", code: "FPTU" },
];
