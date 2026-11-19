/**
 * "Hỏi thêm AI" (port of StudyChill `AskAi`): build a question + context, copy it, then open the
 * provider's own page in a new tab. Nothing is embedded and no TOEIC Space tokens are spent.
 * Pure (copying lives in the component).
 */
import { toPlainText } from "../../../shared/components/RichText/parser.ts";
import type { AnswerOption } from "../types/practice-exam.types.ts";
import type { GroupQuestion, QuestionGroup } from "./attemptGroups.ts";

/** Context is cut to this length so a huge block is never pasted into a chat box. */
export const ASK_AI_MAX_CHARS = 12_000;

export interface AskAiPrompt {
  id: "why" | "eliminate" | "grammar" | "vocabulary";
  label: string;
  prompt: string;
}

export const ASK_AI_PROMPTS: readonly AskAiPrompt[] = [
  {
    id: "why",
    label: "Vì sao đáp án đó đúng",
    prompt:
      "Mình vừa làm câu hỏi TOEIC dưới đây. Hãy giải thích bằng tiếng Việt vì sao đáp án đúng là đáp án đó, chỉ rõ chỗ nào trong bài/đề cho biết điều ấy. Nếu mình chọn sai, nói thẳng mình đã hiểu nhầm ở đâu.",
  },
  {
    id: "eliminate",
    label: "Loại trừ các đáp án sai",
    prompt:
      "Mình vừa làm câu hỏi TOEIC dưới đây. Hãy phân tích bằng tiếng Việt TỪNG lựa chọn: vì sao mỗi đáp án sai lại sai, và dấu hiệu nào giúp loại nó nhanh trong phòng thi.",
  },
  {
    id: "grammar",
    label: "Ngữ pháp / cấu trúc",
    prompt:
      "Mình đang luyện TOEIC. Với câu hỏi dưới đây, hãy chỉ ra điểm ngữ pháp hoặc cấu trúc mà đề đang kiểm tra, giải thích bằng tiếng Việt và cho 2 câu ví dụ tương tự để mình nhận ra dạng này lần sau.",
  },
  {
    id: "vocabulary",
    label: "Từ vựng nên học",
    prompt:
      "Mình đang luyện TOEIC. Từ đề và bài dưới đây, hãy chọn 8-12 từ/cụm từ đáng học nhất, kèm nghĩa tiếng Việt, phiên âm, loại từ và một câu ví dụ mới cho mỗi từ.",
  },
];

export interface AiProvider {
  id: "chatgpt" | "gemini" | "claude";
  name: string;
  url: string;
}

/** Providers opened in a new tab (the learner uses their own account there). */
export const AI_PROVIDERS: readonly AiProvider[] = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com/app" },
  { id: "claude", name: "Claude", url: "https://claude.ai/new" },
];

const optionLine = (q: GroupQuestion, key: AnswerOption) => {
  const text = toPlainText(q.options.find((o) => o.key === key)?.text);
  return `(${key}) ${text || "—"}`;
};

/** Plain-text block of one question with options, the correct answer and the learner's choice. */
export function describeQuestion(q: GroupQuestion, selected: AnswerOption | null): string {
  const lines = [`Câu ${q.number} (Part ${q.part})${q.text ? `: ${toPlainText(q.text)}` : ""}`];
  lines.push(...q.options.map((o) => optionLine(q, o.key)));
  if (q.reveal) lines.push(`Đáp án đúng: (${q.reveal.correctAnswer})`);
  lines.push(`Mình chọn: ${selected ? `(${selected})` : "chưa chọn"}`);
  const transcript = toPlainText(q.reveal?.transcript);
  if (transcript) lines.push(`Lời thoại: ${transcript}`);
  return lines.join("\n");
}

/**
 * Full message: prompt + passage / script + the group's questions, cut to 12k characters.
 * `answerOf` returns the learner's choice of a question id.
 */
export function buildAskAiMessage(
  prompt: AskAiPrompt,
  group: QuestionGroup,
  answerOf: (questionId: string) => AnswerOption | null,
): string {
  const sections: string[] = [];
  const passage = toPlainText(group.content);
  if (passage) {
    const title = group.title ? `: ${toPlainText(group.title)}` : "";
    sections.push(`--- BÀI ĐỌC${title} ---\n${passage}\n--- HẾT BÀI ĐỌC ---`);
  }
  const questions = group.questions.map((q) => describeQuestion(q, answerOf(q.id))).join("\n\n");
  sections.push(`--- ĐỀ BÀI VÀ ĐÁP ÁN ---\n${questions}\n--- HẾT ---`);
  return `${prompt.prompt}\n\n${sections.join("\n\n")}`.slice(0, ASK_AI_MAX_CHARS);
}
