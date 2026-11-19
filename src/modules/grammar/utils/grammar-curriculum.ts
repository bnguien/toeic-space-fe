// Khung chương trình TOEIC SPACE GRAMMAR 0 → 990: 5 chặng, 44 chuyên đề (đánh số liên tục), mỗi chuyên đề có
// 3–5 đơn vị kiến thức; chỉ ghi mục con khi mỗi mục đủ thành một bài nhỏ riêng (tối đa 4). Mỗi chuyên đề mặc định có 3 phần: Kiến thức, Từ vựng, Bài tập.

export interface CurriculumTheory {
  title: string;
  subItems: string[];
}

export interface CurriculumTopic {
  number: number;
  title: string;
  featured?: boolean;
  extended?: boolean;
  units: CurriculumTheory[];
}

export interface CurriculumStage {
  id: string;
  number: string;
  score: string;
  title: string;
  description: string;
  topics: CurriculumTopic[];
  test: { title: string; description: string };
}

export interface TopicPartInfo {
  id: "theory" | "vocab" | "exercises";
  title: string;
}

const k = (title: string, items: string[] = []): CurriculumTheory => ({ title, subItems: items });

export const GRAMMAR_STAGES: CurriculumStage[] = [
  {
    id: "stage-01",
    number: "01",
    score: "250+",
    title: "Khởi động",
    description: "Mất gốc → Có nền",
    topics: [
      {
        number: 1,
        title: "Cấu trúc câu tiếng Anh căn bản",
        units: [
          k("Thành phần của câu", ["Chủ ngữ và động từ", "Tân ngữ và bổ ngữ"]),
          k("5 mẫu câu cơ bản"),
          k("Cụm từ và mệnh đề"),
          k("Phân tích một câu đơn"),
        ],
      },
      {
        number: 2,
        title: "Động từ chính, trợ động từ & TO BE",
        units: [
          k("Động từ thường và động từ nối"),
          k("Động từ TO BE", ["Am / Is / Are", "Was / Were"]),
          k("Trợ động từ Do / Have / Will"),
          k("Xác định động từ chính của câu"),
        ],
      },
      {
        number: 3,
        title: "Câu khẳng định, phủ định & nghi vấn",
        units: [
          k("Câu khẳng định và phủ định", ["Với TO BE", "Với động từ thường"]),
          k("Câu hỏi Yes / No"),
          k("Câu hỏi WH-"),
          k("Câu mệnh lệnh"),
        ],
      },
      {
        number: 4,
        title: "Danh từ căn bản",
        units: [
          k("Nhận diện danh từ", ["Vị trí trong câu", "Hậu tố danh từ"]),
          k("Danh từ đếm được", ["Số ít và số nhiều", "Số nhiều bất quy tắc"]),
          k("Danh từ không đếm được"),
        ],
      },
      {
        number: 5,
        title: "Mạo từ & từ chỉ định",
        units: [
          k("Mạo từ A / AN"),
          k("Mạo từ THE"),
          k("Khi nào không dùng mạo từ"),
          k("This / That / These / Those"),
        ],
      },
      {
        number: 6,
        title: "Đại từ & sở hữu",
        units: [
          k("Đại từ chủ ngữ và tân ngữ"),
          k("Tính từ sở hữu và đại từ sở hữu"),
          k("Sở hữu cách 's"),
          k("Đại từ phản thân"),
        ],
      },
      {
        number: 7,
        title: "Tính từ & trạng từ căn bản",
        units: [
          k("Tính từ: vị trí và dấu hiệu"),
          k("Trạng từ: vị trí và đuôi -ly"),
          k("Phân biệt tính từ và trạng từ"),
          k("Trạng từ tần suất"),
        ],
      },
      {
        number: 8,
        title: "Các thì tiếng Anh nền tảng",
        units: [
          k("Hiện tại đơn"),
          k("Hiện tại tiếp diễn"),
          k("Quá khứ đơn", ["Động từ có quy tắc", "Động từ bất quy tắc"]),
          k("Tương lai: Will / Be going to"),
          k("Phân biệt các thì cơ bản"),
        ],
      },
      {
        number: 9,
        title: "Giới từ & liên từ căn bản",
        units: [
          k("Giới từ thời gian At / On / In"),
          k("Giới từ nơi chốn At / On / In"),
          k("Giới từ thường gặp khác"),
          k("Liên từ And / But / Or / So / Because"),
        ],
      },
    ],
    test: { title: "Checkpoint 250+", description: "Tổng ôn Chặng 01" },
  },
  {
    id: "stage-02",
    number: "02",
    score: "450+",
    title: "Phản xạ",
    description: "Biết quy tắc → Nhận diện nhanh",
    topics: [
      {
        number: 10,
        title: "Word Form căn bản",
        units: [
          k("Bốn từ loại chính và họ từ"),
          k("Hậu tố nhận biết từ loại"),
          k("Vị trí của từng từ loại"),
          k("Chọn dạng từ đúng trong câu"),
        ],
      },
      {
        number: 11,
        title: "Danh từ & cụm danh từ",
        units: [
          k("Cấu trúc cụm danh từ"),
          k("Danh từ ghép Noun + Noun"),
          k("Bổ nghĩa phía sau danh từ"),
        ],
      },
      {
        number: 12,
        title: "Từ hạn định & lượng từ",
        units: [
          k("Some / Any / No"),
          k("Lượng từ theo loại danh từ", [
            "Many / Much",
            "(A) few / (A) little",
            "Number / Amount",
          ]),
          k("Each / Every / Both / Either / Neither"),
          k("Another / Other / Others"),
        ],
      },
      {
        number: 13,
        title: "Tính từ & trạng từ trong TOEIC",
        units: [
          k("Tính từ đuôi -ed và -ing"),
          k("Tính từ sau động từ nối"),
          k("Trạng từ bổ nghĩa cho động từ, tính từ, cả câu"),
          k("Các cặp tính từ / trạng từ dễ nhầm"),
        ],
      },
      {
        number: 14,
        title: "Hệ thống thì & dấu hiệu thời gian",
        units: [
          k("Hiện tại đơn và hiện tại tiếp diễn"),
          k("Quá khứ đơn"),
          k("Hiện tại hoàn thành", ["Since / For", "Already / Yet / Recently"]),
          k("Các cách diễn đạt tương lai"),
          k("Chọn thì theo dấu hiệu thời gian"),
        ],
      },
      {
        number: 15,
        title: "Hòa hợp Chủ ngữ – Động từ",
        units: [
          k("Chủ ngữ số ít và số nhiều"),
          k("Chủ ngữ bị ngăn cách khỏi động từ"),
          k("Chủ ngữ đặc biệt", ["Each / Every", "Either / Neither", "Danh từ tập hợp"]),
          k("Chủ ngữ ghép And / Or / Nor"),
        ],
      },
      {
        number: 16,
        title: "Câu bị động",
        units: [
          k("Cấu trúc bị động Be + V3"),
          k("Bị động ở các thì và với động từ khuyết thiếu"),
          k("Chọn chủ động hay bị động"),
        ],
      },
      {
        number: 17,
        title: "Gerund, Infinitive & Verb Pattern",
        units: [
          k("V-ing làm danh từ"),
          k("To V chỉ mục đích và sau tính từ"),
          k("Động từ + V-ing / To V", [
            "Đi với V-ing",
            "Đi với To V",
            "Đổi nghĩa: stop, remember, try",
          ]),
        ],
      },
      {
        number: 18,
        title: "Giới từ đi cùng từ",
        units: [
          k("Động từ + giới từ"),
          k("Tính từ + giới từ"),
          k("Danh từ + giới từ"),
          k("Cụm giới từ cố định"),
        ],
      },
      {
        number: 19,
        title: "So sánh & mức độ",
        units: [
          k("So sánh hơn và so sánh nhất"),
          k("So sánh bằng"),
          k("Từ nhấn mạnh Much / Far / Slightly"),
          k("Too và Enough"),
        ],
      },
    ],
    test: { title: "Checkpoint 450+", description: "Tổng ôn Chặng 02" },
  },
  {
    id: "stage-03",
    number: "03",
    score: "650+",
    title: "Tăng tốc",
    description: "Phân tích cấu trúc → Xử lý câu phức",
    topics: [
      {
        number: 20,
        title: "Liên từ, giới từ & quan hệ logic",
        units: [
          k("Nguyên nhân – kết quả"),
          k("Tương phản"),
          k("Thời gian và điều kiện"),
          k("Liên từ hay giới từ?"),
        ],
      },
      {
        number: 21,
        title: "Mệnh đề quan hệ",
        units: [
          k("Đại từ quan hệ", ["Who / Whom", "Which / That", "Whose"]),
          k("Trạng từ quan hệ Where / When / Why"),
          k("Mệnh đề quan hệ xác định và không xác định"),
          k("Lược bỏ đại từ quan hệ"),
        ],
      },
      {
        number: 22,
        title: "Mệnh đề trạng ngữ",
        units: [
          k("Mệnh đề thời gian"),
          k("Mệnh đề nguyên nhân và kết quả"),
          k("Mệnh đề tương phản"),
          k("Mệnh đề điều kiện và mục đích"),
        ],
      },
      {
        number: 23,
        title: "Mệnh đề danh từ",
        units: [
          k("That-clause"),
          k("Whether / If"),
          k("WH-clause"),
          k("Vị trí của mệnh đề danh từ"),
        ],
      },
      {
        number: 24,
        title: "Câu điều kiện",
        units: [
          k("Điều kiện loại 0 và loại 1"),
          k("Điều kiện loại 2"),
          k("Điều kiện loại 3"),
          k("Unless / Provided that / As long as"),
        ],
      },
      {
        number: 25,
        title: "Phân từ hiện tại & quá khứ",
        units: [
          k("V-ing và V3 làm tính từ"),
          k("Phân từ đứng sau danh từ"),
          k("Chọn V-ing hay V3"),
        ],
      },
      {
        number: 26,
        title: "Mệnh đề rút gọn",
        units: [
          k("Rút gọn mệnh đề quan hệ", ["Bằng V-ing", "Bằng V3", "Bằng To V"]),
          k("Rút gọn mệnh đề trạng ngữ"),
          k("Khi nào không rút gọn được"),
        ],
      },
      {
        number: 27,
        title: "Cụm danh từ phức & hệ thống bổ nghĩa",
        units: [
          k("Bổ nghĩa phía trước danh từ"),
          k("Bổ nghĩa phía sau danh từ"),
          k("Tìm danh từ chính trong cụm dài"),
        ],
      },
      {
        number: 28,
        title: "Word Form Mastery",
        units: [
          k("Họ từ và hậu tố nâng cao"),
          k("Chọn từ loại theo vị trí"),
          k("Đáp án cùng từ loại: chọn theo nghĩa"),
          k("Word Form trong đoạn văn"),
        ],
      },
      {
        number: 29,
        title: "Phân tích cấu trúc câu TOEIC",
        featured: true,
        units: [
          k("Tìm mệnh đề chính", ["Chủ ngữ chính", "Động từ đã chia"]),
          k("Tách thành phần bổ nghĩa"),
          k("Câu nhiều mệnh đề"),
          k("Xác định thứ cần điền", ["Từ loại", "Cấu trúc"]),
        ],
      },
    ],
    test: { title: "Grammar Test 650+", description: "Kiểm tra Chặng 03" },
  },
  {
    id: "stage-04",
    number: "04",
    score: "800+",
    title: "Bứt phá",
    description: "Làm chủ câu dài & cấu trúc khó",
    topics: [
      {
        number: 30,
        title: "Hệ thống thì nâng cao",
        units: [
          k("Quá khứ tiếp diễn và quá khứ hoàn thành"),
          k("Hiện tại hoàn thành tiếp diễn"),
          k("Tương lai tiếp diễn và tương lai hoàn thành"),
          k("Trình tự thời gian giữa các hành động"),
        ],
      },
      {
        number: 31,
        title: "Bị động nâng cao & cấu trúc tường thuật",
        units: [
          k("Bị động hoàn thành và với động từ khuyết thiếu"),
          k("Bị động với hai tân ngữ"),
          k("Tường thuật bị động: It is said that…"),
          k("Be expected / required / scheduled to"),
        ],
      },
      {
        number: 32,
        title: "Verb Pattern & Causative nâng cao",
        units: [
          k("Động từ + tân ngữ + To V / V-ing"),
          k("Make / Let + tân ngữ + V"),
          k("Have / Get sai khiến", ["Have sb do sth", "Have / Get sth done"]),
          k("Động từ tường thuật"),
        ],
      },
      {
        number: 33,
        title: "Quan hệ từ nâng cao",
        units: [
          k("Whom và Whose"),
          k("Giới từ + Which / Whom"),
          k("Whoever / Whatever / Whichever"),
        ],
      },
      {
        number: 34,
        title: "Modal nâng cao & suy đoán",
        units: [
          k("Mức độ chắc chắn ở hiện tại"),
          k("Suy đoán về quá khứ", ["Must have + V3", "May / Might / Could have + V3"]),
          k("Should have + V3"),
        ],
      },
      {
        number: 35,
        title: "Cấu trúc giả định",
        units: [
          k("Giả định: S + V nguyên mẫu"),
          k("Sau Suggest / Recommend / Require / Insist"),
          k("Sau It is essential / important that"),
        ],
      },
      {
        number: 36,
        title: "Cấu trúc song song & liên từ tương liên",
        units: [
          k("Cấu trúc song song"),
          k("Both … and / Either … or / Neither … nor"),
          k("Not only … but also"),
          k("Chia động từ sau liên từ tương liên"),
        ],
      },
      {
        number: 37,
        title: "Phân tích câu nhiều tầng bổ nghĩa",
        units: [
          k("Tìm câu lõi"),
          k("Các lớp bổ nghĩa", [
            "Cụm giới từ",
            "Mệnh đề quan hệ",
            "Cụm phân từ",
            "Thông tin chèn",
          ]),
          k("Bóc tách câu dài"),
        ],
      },
    ],
    test: { title: "Grammar Challenge 800+", description: "Thử thách Chặng 04" },
  },
  {
    id: "stage-05",
    number: "05",
    score: "990",
    title: "Về đích",
    description: "Độ chính xác, tốc độ & khả năng làm chủ ngữ cảnh",
    topics: [
      {
        number: 38,
        title: "Vị trí từ bổ nghĩa & nghĩa của câu",
        units: [
          k("Vị trí tính từ và trạng từ"),
          k("Từ bổ nghĩa đặt sai chỗ"),
          k("Từ bổ nghĩa gây mơ hồ"),
          k("Đổi vị trí, đổi nghĩa"),
        ],
      },
      {
        number: 39,
        title: "Danh hóa & cụm danh từ mật độ cao",
        units: [
          k("Danh hóa động từ và tính từ"),
          k("Chuỗi danh từ mật độ cao"),
          k("Văn phong thương mại cô đọng"),
        ],
      },
      {
        number: 40,
        title: "Cấu trúc nâng cao mở rộng",
        extended: true,
        units: [
          k("Đảo ngữ"),
          k("Câu chẻ It is … that"),
          k("Nhấn mạnh và phủ định nâng cao"),
          k("Tỉnh lược"),
        ],
      },
      {
        number: 41,
        title: "Grammar Mastery trong Part 6",
        units: [
          k("Ngữ pháp theo ngữ cảnh đoạn văn"),
          k("Đại từ và từ thay thế"),
          k("Từ nối giữa các câu"),
          k("Chọn câu điền vào đoạn"),
        ],
      },
      {
        number: 42,
        title: "Grammar Mastery trong Part 7",
        units: [
          k("Đọc nhanh câu dài"),
          k("Cụm danh từ và chuỗi bổ nghĩa"),
          k("Đại từ chỉ ai, chỉ gì"),
          k("Mệnh đề rút gọn và văn phong trang trọng"),
        ],
      },
      {
        number: 43,
        title: "Phân biệt các lựa chọn gần nhau",
        featured: true,
        units: [
          k("Danh / Động / Tính / Trạng từ"),
          k("Từ hạn định", ["Another / Other / Others", "Each / Every", "Much / Many"]),
          k("Liên từ và giới từ", [
            "Because / Because of",
            "Although / Despite",
            "However / Therefore",
          ]),
          k("Who / Whom / Which / That"),
          k("V-ing / V3"),
        ],
      },
      {
        number: 44,
        title: "Grammar Speed & Error Clinic",
        units: [
          k("Nhận diện dạng câu hỏi"),
          k("Phân tích chỗ trống và loại trừ đáp án"),
          k("Làm bài trong giới hạn thời gian"),
          k("Phân loại lỗi sai", [
            "Thiếu kiến thức",
            "Nhầm từ loại / cấu trúc",
            "Sai ngữ cảnh",
            "Bất cẩn",
          ]),
          k("Ôn tập theo lỗi của bản thân"),
        ],
      },
    ],
    test: { title: "Grammar Mastery Test 990", description: "100 câu" },
  },
];

/** Ba phần mặc định của mọi chuyên đề. */
export const TOPIC_PARTS: TopicPartInfo[] = [
  { id: "theory", title: "Kiến thức" },
  { id: "vocab", title: "Từ vựng" },
  { id: "exercises", title: "Bài tập" },
];

export const TOPIC_COUNT = GRAMMAR_STAGES.reduce((n, c) => n + c.topics.length, 0);
