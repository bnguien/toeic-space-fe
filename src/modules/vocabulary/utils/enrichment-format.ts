import type { Tone } from "@/shared/components/ui";

import type { PartOfSpeech } from "../types/vocabulary.types";

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
export const toPartOfSpeech = (value: string | undefined | null): PartOfSpeech =>
  value && KNOWN_POS.has(value as PartOfSpeech) ? (value as PartOfSpeech) : "other";

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
