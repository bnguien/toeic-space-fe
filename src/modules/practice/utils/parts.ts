/** TOEIC part facts shared by every practice screen (pure; tested in tests/practice-exam-*.test.mjs). */
import type { ToeicSection } from "../types/practice-exam.types.ts";

export interface PartMeta {
  part: number;
  section: ToeicSection;
  /** Vietnamese name, e.g. "Mô tả tranh". */
  name: string;
  /** ETS name, e.g. "Photographs". */
  enName: string;
  /** Questions in a full test. */
  count: number;
  /** Rough minutes for this part when practised alone. */
  minutes: number;
  /** Question numbers of a full test. */
  range: readonly [number, number];
  /** Colour family token: Listening = blue, Reading = rose (see README). */
  tone: "blue" | "rose";
  /** Short learner instruction shown above the left panel. */
  instruction: string;
}

export const PART_META: readonly PartMeta[] = [
  {
    part: 1,
    section: "listening",
    name: "Mô tả tranh",
    enName: "Photographs",
    count: 6,
    minutes: 3,
    range: [1, 6],
    tone: "blue",
    instruction: "Look at the picture and choose the statement that best describes it.",
  },
  {
    part: 2,
    section: "listening",
    name: "Hỏi & Đáp",
    enName: "Question-Response",
    count: 25,
    minutes: 9,
    range: [7, 31],
    tone: "blue",
    instruction: "Listen to the question and choose the best response.",
  },
  {
    part: 3,
    section: "listening",
    name: "Hội thoại ngắn",
    enName: "Conversations",
    count: 39,
    minutes: 17,
    range: [32, 70],
    tone: "blue",
    instruction: "Listen to the conversation and answer the questions.",
  },
  {
    part: 4,
    section: "listening",
    name: "Bài nói ngắn",
    enName: "Talks",
    count: 30,
    minutes: 16,
    range: [71, 100],
    tone: "blue",
    instruction: "Listen to the talk and answer the questions.",
  },
  {
    part: 5,
    section: "reading",
    name: "Hoàn thành câu",
    enName: "Incomplete Sentences",
    count: 30,
    minutes: 15,
    range: [101, 130],
    tone: "rose",
    instruction: "Choose the word or phrase that best completes the sentence.",
  },
  {
    part: 6,
    section: "reading",
    name: "Điền đoạn văn",
    enName: "Text Completion",
    count: 16,
    minutes: 10,
    range: [131, 146],
    tone: "rose",
    instruction: "Choose the best answer to complete the text.",
  },
  {
    part: 7,
    section: "reading",
    name: "Đọc hiểu",
    enName: "Reading Comprehension",
    count: 54,
    minutes: 50,
    range: [147, 200],
    tone: "rose",
    instruction: "Read the text(s) and answer the questions.",
  },
];

export const ALL_PARTS = [1, 2, 3, 4, 5, 6, 7] as const;
export const LISTENING_PARTS = [1, 2, 3, 4] as const;
export const READING_PARTS = [5, 6, 7] as const;

/** Part metadata; out-of-range numbers fall back to Part 7. */
export const partMeta = (part: number): PartMeta =>
  PART_META.find((meta) => meta.part === part) ?? PART_META[6];

export const isListeningPart = (part: number) => part >= 1 && part <= 4;
export const sectionOf = (part: number): ToeicSection =>
  isListeningPart(part) ? "listening" : "reading";
export const sectionLabel = (section: ToeicSection) =>
  section === "listening" ? "Listening" : "Reading";

/** Part a question number belongs to in a full test (1..200). */
export const partFromNumber = (questionNumber: number): number =>
  (
    PART_META.find((m) => questionNumber >= m.range[0] && questionNumber <= m.range[1]) ??
    PART_META[6]
  ).part;

/** Options shown for a part: Part 2 has A–C only. */
export const optionKeysOf = (part: number) =>
  part === 2 ? (["A", "B", "C"] as const) : (["A", "B", "C", "D"] as const);

/** "x/7 phần · N câu · ~M phút" figures for a set of parts of a full test. */
export function partsSummary(parts: readonly number[]) {
  const metas = PART_META.filter((meta) => parts.includes(meta.part));
  return {
    partCount: metas.length,
    questions: metas.reduce((sum, meta) => sum + meta.count, 0),
    minutes: metas.reduce((sum, meta) => sum + meta.minutes, 0),
  };
}

/* ---- Practice set levels ---- */

export interface LevelMeta {
  level: number;
  label: string;
  target: number;
}

/** Level 1..5 of a practice set → label and target score. */
export const LEVELS: readonly LevelMeta[] = [
  { level: 1, label: "Căn bản", target: 450 },
  { level: 2, label: "Sơ cấp", target: 550 },
  { level: 3, label: "Trung cấp", target: 650 },
  { level: 4, label: "Nâng cao", target: 750 },
  { level: 5, label: "Chuyên sâu", target: 850 },
];

export const levelMeta = (level: number | null | undefined): LevelMeta | null =>
  LEVELS.find((meta) => meta.level === level) ?? null;

/** "Căn bản 450+"; falls back to the target score alone, or null. */
export function levelTargetLabel(level: number | null | undefined, targetScore?: number | null) {
  const meta = levelMeta(level);
  if (meta) return `${meta.label} ${targetScore ?? meta.target}+`;
  return targetScore ? `${targetScore}+` : null;
}

/** Practice route of a part: Listening parts live under `/practice/listening`. */
export const partSpacePath = (part: number) =>
  `/practice/${isListeningPart(part) ? "listening" : "reading"}?part=${part}`;
