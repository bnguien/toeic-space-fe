/**
 * Curriculum lookups and labels of the grammar page (port of Studychill `grammarData.js`). Lesson content comes from
 * the API (hooks/useGrammarLesson).
 */
import type { GrammarKnowledgeUnit } from "../types/knowledge.types";
import { GRAMMAR_STAGES, type CurriculumStage, type CurriculumTopic } from "./grammar-curriculum";
import { parseCode } from "./grammar-text";

/** Stage containing topic number `so`. */
export function stageOfTopic(topicNum: number): CurriculumStage | null {
  return GRAMMAR_STAGES.find((s) => s.topics.some((c) => c.number === topicNum)) || null;
}

export function topicInfo(topicNum: number): CurriculumTopic | null {
  const stage = stageOfTopic(topicNum);
  return stage ? stage.topics.find((c) => c.number === topicNum) || null : null;
}

/** Title of a unit / sub-unit code ('CĐ04.1.2' → 'Hậu tố danh từ'): the loaded knowledge first, else the curriculum. */
export function codeTitle(
  code: string,
  knowledge?: { units?: GrammarKnowledgeUnit[] } | null,
): string {
  const findTitle = (units: GrammarKnowledgeUnit[] | undefined): string => {
    for (const u of units || []) {
      if (u.code === code) return u.title;
      const m = findTitle(u.subItems);
      if (m) return m;
    }
    return "";
  };
  const fromLesson = knowledge ? findTitle(knowledge.units) : "";
  if (fromLesson) return fromLesson;
  const parsed = parseCode(code);
  const unit = parsed ? topicInfo(parsed.topic)?.units[parsed.unitIndex] : null;
  if (!parsed || !unit) return "";
  return parsed.subIndex === null ? unit.title : unit.subItems[parsed.subIndex] || unit.title;
}

export const stageById = (id: string): CurriculumStage | null =>
  GRAMMAR_STAGES.find((s) => s.id === id) || null;

/** Size in kb → “2,2 MB”. */
export const POS_ABBR: Record<string, string> = {
  n: "n",
  v: "v",
  adj: "adj",
  adv: "adv",
  prep: "prep",
  conj: "conj",
  pron: "pron",
  det: "det",
  phrase: "cụm",
};
export const POS_NAMES: Record<string, string> = {
  n: "danh từ",
  v: "động từ",
  adj: "tính từ",
  adv: "trạng từ",
  prep: "giới từ",
  conj: "liên từ",
  pron: "đại từ",
  det: "từ hạn định",
  phrase: "cụm từ",
};
export const NOUN_COUNTABILITY: Record<string, string> = {
  countable: "đếm được",
  uncountable: "không đếm được",
  both: "cả hai",
  "plural-only": "chỉ số nhiều",
};
export const VOCAB_THEMES: Record<string, string> = {
  office: "Văn phòng",
  hr: "Nhân sự",
  finance: "Tài chính",
  shopping: "Mua sắm",
  travel: "Du lịch",
  manufacturing: "Sản xuất",
  conference: "Hội nghị",
  "real-estate": "Bất động sản",
  health: "Y tế",
  technology: "Công nghệ",
  delivery: "Giao hàng",
  marketing: "Marketing",
  hospitality: "Nhà hàng – khách sạn",
};
export const DIFFICULTY_LABELS: Record<string, string> = { easy: "Dễ", medium: "Vừa", hard: "Khó" };
