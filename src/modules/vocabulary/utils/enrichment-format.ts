import type { Tone } from "@/shared/components/ui";

import type { PartOfSpeech, SavedWordDto } from "../types/vocabulary.types";

interface SourceView {
  label: string;
  tone: Tone;
}

/** Chip of a looked-up field's provenance; `cache` keeps no chip. */
const SOURCES: Record<string, SourceView> = {
  catalog: { label: "Bộ từ", tone: "blue" },
  dictionary: { label: "Từ điển", tone: "green" },
  google: { label: "Google", tone: "pearl" },
  mymemory: { label: "Dịch", tone: "pearl" },
  ai: { label: "AI", tone: "pink" },
  /** The learner's own edit of the word. */
  personal: { label: "Của tôi", tone: "rose" },
};

export const describeSource = (source: string | undefined): SourceView | undefined =>
  source ? SOURCES[source] : undefined;

export const FIELD_LABELS: Record<string, string> = {
  phonetic: "Phiên âm",
  partOfSpeech: "Từ loại",
  meaningVi: "Nghĩa",
  definitionEn: "Định nghĩa",
  example: "Ví dụ",
  exampleVi: "Dịch ví dụ",
};

export const PHRASE_TYPE_LABELS: Record<string, string> = {
  idiom: "Thành ngữ",
  phrasal_verb: "Cụm động từ",
  collocation: "Kết hợp từ",
  fixed: "Cụm cố định",
  literal: "Nghĩa đen",
};

const KNOWN_POS = new Set<PartOfSpeech>([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "pronoun",
  "determiner",
  "interjection",
  "phrase",
  "other",
]);

/** Server POS → our enum (the server already normalises; this guards the select). */
export const toPartOfSpeech = (value: string | undefined | null): PartOfSpeech => {
  const key = (value ?? "").toLowerCase() as PartOfSpeech;
  return KNOWN_POS.has(key) ? key : "other";
};

/** Labels of rejected lines / failed rows by server code. */
const CODE_LABELS: Record<string, string> = {
  too_long: "Quá dài",
  no_latin_letter: "Không có chữ cái Latin",
  too_many_tokens: "Quá nhiều từ",
  empty: "Trống",
  duplicate: "Trùng",
  invalid_json: "JSON không hợp lệ",
  enrichment_timeout: "Hết thời gian tra cứu",
  missing_meaning: "Thiếu nghĩa",
};

export const describeCode = (code: string): string => CODE_LABELS[code] ?? code;

/** A custom word with an empty field that AI can fill. */
export const canAiFill = ({ isCustom, word }: SavedWordDto): boolean =>
  isCustom &&
  [word.phonetic, word.definitionEn, word.example, word.exampleVi].some((value) => !value?.trim());
