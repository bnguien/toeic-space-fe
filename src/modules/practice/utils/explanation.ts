/**
 * Normalises imported explanations into one shape (port of StudyChill `toeicExplanation.js`):
 *  - raw JSON vocabulary arrays (`[{"word": …}]`) embedded in the HTML are pulled out as cards;
 *  - section titles get one canonical name;
 *  - a tip that is really vocabulary becomes cards, any other tip becomes the note.
 * The returned `html` is still untrusted markup: render it with `RichText` only. Pure, no DOM.
 */

export interface VocabCard {
  word: string;
  pos: string;
  meaningVi: string;
  ipa: string;
  exampleEn: string;
  exampleVi: string;
  cefr: string;
}

export interface NormalizedExplanation {
  html: string;
  vocab: VocabCard[];
  note: string;
}

const CANONICAL_SECTIONS: [RegExp, string][] = [
  [/^🔍\s*(Các lựa chọn|Phân tích chi tiết từng lựa chọn)\s*:?\s*$/iu, "🔍 Phân tích các lựa chọn"],
  [/^(🌐|📖)\s*Dịch nghĩa[^:]*:?\s*$/iu, "🌐 Dịch nghĩa"],
  [/^(📚|⭐|💡)\s*[^:]*Từ vựng[^:]*:?\s*$/iu, "📚 Từ vựng & ngữ pháp"],
  [/^💡\s*Ghi chú[^:]*:?\s*$/iu, "💡 Ghi chú & dẫn chứng"],
  [/^💡\s*(Mẹo|Trọng tâm)[^:]*:?\s*$/iu, "💡 Mẹo làm bài"],
];

/** Canonical name of an explanation section title (unknown titles are kept). */
export function canonicalSectionName(name: string): string {
  const title = name.trim();
  return CANONICAL_SECTIONS.find(([pattern]) => pattern.test(title))?.[1] ?? title;
}

const decodeEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type RawWord = Record<string, unknown>;

/** A JSON vocabulary array → its items; anything else → null. */
export function parseVocabJson(value: string): RawWord[] | null {
  const text = decodeEntities(value).trim();
  if (!text.startsWith("[") || !text.endsWith("]")) return null;
  try {
    const data: unknown = JSON.parse(text);
    return Array.isArray(data) &&
      data.some((item) => item && typeof item === "object" && "word" in item)
      ? (data.filter((item) => item && typeof item === "object") as RawWord[])
      : null;
  } catch {
    return null;
  }
}

// "Word (n): nghĩa" · "book (v) đặt" · "Look up (v.phr): tra cứu" · "return: trả lại"
const LINE_WITH_POS = /^([A-Za-z][A-Za-z\s\-'’.]*?)\s*\(([A-Za-z./\s]{1,12})\)\s*[:\-–—]?\s*(.+)$/;
const LINE_WITH_COLON = /^([A-Za-z][A-Za-z\s\-'’.]{0,40}?)\s*[:\-–—]\s*(.+)$/;

/** "word (pos): meaning" lines → items; null when most lines are not vocabulary (a plain tip). */
export function parseVocabText(value: string): RawWord[] | null {
  const lines = value
    .split(/\n|;|\s\|\s/)
    .map((line) => line.trim().replace(/^[•\-*\s]+/, ""))
    .filter(Boolean);
  if (!lines.length) return null;
  const items: RawWord[] = [];
  for (const line of lines) {
    const withPos = LINE_WITH_POS.exec(line);
    if (withPos) {
      items.push({
        word: withPos[1].trim(),
        pos: withPos[2].trim(),
        meaning_vi: withPos[3].trim(),
      });
      continue;
    }
    const withColon = LINE_WITH_COLON.exec(line);
    if (withColon)
      items.push({ word: withColon[1].trim(), pos: "", meaning_vi: withColon[2].trim() });
  }
  return items.length && items.length >= Math.ceil(lines.length * 0.6) ? items : null;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function toCard(item: RawWord): VocabCard {
  return {
    word: text(item.word),
    pos: text(item.pos),
    meaningVi: text(item.meaning_vi) || text(item.meaning) || text(item.vi),
    ipa: text(item.ipa_us) || text(item.ipa),
    exampleEn: text(item.example_en),
    exampleVi: text(item.example_vi),
    cefr: text(item.cefr),
  };
}

const PAYLOAD_BLOCK = /<div class=['"]tp-vocab-data-payload['"][^>]*>([\s\S]*?)<\/div>/gi;
const JSON_BLOCK = /<(p|div)\b[^>]*>\s*(\[\s*(?:\{|&#123;)[\s\S]*?\])\s*<\/\1>/gi;
const EMPTY_SECTION =
  /<div class=['"]tp-exp-(?:notes|vocab)-card['"][^>]*>\s*<div class=['"]tp-exp-section-title['"][^>]*>\s*<span>[^<]*<\/span>\s*<\/div>\s*<div class=['"]tp-exp-(?:notes-content|vocab-body)['"][^>]*>\s*<\/div>\s*<\/div>/gi;
const SECTION_TITLE = /(<div class=['"]tp-exp-section-title['"][^>]*>\s*<span>)([^<]*)(<\/span>)/gi;
const LOOKS_LIKE_HTML = /<(div|p|span|strong|ul|ol|table)\b[^>]*>/i;

/**
 * `{ html, vocab, note }` of an explanation. `tip` / `vocabulary` are optional extra sources
 * (StudyChill data shapes); TOEIC Space explanations usually only carry `explanation`.
 */
export function normalizeExplanation(
  explanation: string | null | undefined,
  extras: { tip?: string | null; vocabulary?: unknown } = {},
): NormalizedExplanation {
  let source = explanation ?? "";
  let tip = extras.tip ?? "";
  // Old data: the tip is the whole HTML explanation.
  if (LOOKS_LIKE_HTML.test(tip) && !parseVocabJson(tip)) {
    if (!source.trim()) source = tip;
    tip = "";
  }
  const vocab: VocabCard[] = [];
  const seen = new Set<string>();
  const add = (item: RawWord) => {
    const card = toCard(item);
    const key = card.word.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    vocab.push(card);
  };

  let html = source.replace(PAYLOAD_BLOCK, (_, json: string) => {
    (parseVocabJson(json) ?? []).forEach(add);
    return "";
  });
  html = html.replace(JSON_BLOCK, (all: string, tag: string, json: string) => {
    const items = parseVocabJson(json);
    if (!items) return all;
    items.forEach(add);
    // Keep an empty vocab-body shell so EMPTY_SECTION can drop a title-only section.
    return tag.toLowerCase() === "div" ? all.replace(/>[\s\S]*<\/div>$/, "></div>") : "";
  });
  html = html.replace(EMPTY_SECTION, "");
  html = html.replace(
    SECTION_TITLE,
    (_, open: string, name: string, close: string) =>
      `${open}${escapeHtml(canonicalSectionName(decodeEntities(name)))}${close}`,
  );

  let note = "";
  const trimmedTip = tip.trim();
  if (trimmedTip) {
    const json = parseVocabJson(trimmedTip);
    const lines = json ? null : parseVocabText(trimmedTip);
    if (json) json.forEach(add);
    else if (lines) lines.forEach(add);
    else if (!html.includes(trimmedTip)) note = trimmedTip;
  }

  const { vocabulary } = extras;
  if (Array.isArray(vocabulary)) {
    vocabulary.forEach((item) => {
      if (item && typeof item === "object") add(item as RawWord);
    });
  } else if (typeof vocabulary === "string") {
    (parseVocabJson(vocabulary) ?? parseVocabText(vocabulary) ?? []).forEach(add);
  }

  if (!html.trim() && note) {
    html = /<[a-z][\s\S]*>/i.test(note) ? note : `<p>${escapeHtml(note)}</p>`;
    note = "";
  }
  return { html: html.trim(), vocab, note };
}
