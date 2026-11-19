/**
 * Prompt the learner copies into an AI chat together with a document; the answer is pasted back
 * into the JSON tab of "Thêm từ". Keep the output shape in sync with the server JSON parser.
 */
export const AI_IMPORT_PROMPT = `Bạn là trợ lý soạn từ vựng TOEIC. Tôi sẽ gửi kèm một tài liệu (văn bản, ảnh hoặc PDF).

Nhiệm vụ: trích xuất các từ và cụm từ tiếng Anh đáng học trong tài liệu, nhóm theo chủ đề, và trả về DUY NHẤT một mảng JSON hợp lệ theo đúng cấu trúc sau, không kèm lời giải thích, không bọc trong khối \`\`\`:

[
  {
    "category": "Tên chủ đề ngắn bằng tiếng Việt",
    "words": [
      {
        "word": "từ hoặc cụm từ tiếng Anh, viết thường trừ danh từ riêng",
        "ipa": "/phiên âm IPA/",
        "pos": "noun | verb | adjective | adverb | preposition | conjunction | pronoun | determiner | interjection | phrase",
        "meaning": "nghĩa tiếng Việt ngắn gọn (2–6 từ), đúng với ngữ cảnh trong tài liệu",
        "example": "một câu ví dụ tiếng Anh ngắn, phong cách TOEIC (công sở, đời sống)",
        "example_vi": "bản dịch tiếng Việt tự nhiên của câu ví dụ"
      }
    ]
  }
]

Quy tắc:
- Mỗi từ chỉ xuất hiện một lần trong toàn bộ kết quả.
- Bỏ qua tên người, số, từ quá cơ bản (a, the, is, ...).
- Cụm động từ và thành ngữ giữ nguyên cụm, "pos" là "phrase".
- Không để trống "word" và "meaning"; các trường khác nếu không chắc thì để chuỗi rỗng.
- Chỉ trả về JSON.`;
