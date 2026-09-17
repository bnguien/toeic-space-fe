/**
 * Helpers for TOEIC content imported from Studychill (dautoeic / toeicmentors sources).
 * Fields hold either plain text or simple HTML; nothing here ever produces HTML strings.
 */

/** Source tag → rendered tag. Anything else is unwrapped (children kept) or dropped. */
export const TAG_MAP: Record<string, string> = {
  p: "p",
  br: "br",
  hr: "hr",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "u",
  s: "s",
  sup: "sup",
  sub: "sub",
  small: "small",
  mark: "mark",
  code: "code",
  h1: "h3",
  h2: "h3",
  h3: "h4",
  h4: "h5",
  h5: "h6",
  h6: "h6",
  ul: "ul",
  ol: "ol",
  li: "li",
  dl: "dl",
  dt: "dt",
  dd: "dd",
  table: "table",
  caption: "caption",
  thead: "thead",
  tbody: "tbody",
  tfoot: "tfoot",
  tr: "tr",
  th: "th",
  td: "td",
  blockquote: "blockquote",
  div: "div",
  section: "div",
  article: "div",
  header: "div",
  footer: "div",
  center: "div",
  pre: "div",
  span: "span",
  font: "span",
  // Links are shown as text: exam content must not navigate anywhere.
  a: "span",
};

export const VOID_TAGS = new Set(["br", "hr"]);

export const INLINE_TAGS = new Set([
  "strong",
  "em",
  "u",
  "s",
  "sup",
  "sub",
  "small",
  "mark",
  "code",
  "span",
  "br",
]);

/** Removed together with their content. */
export const DROPPED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "frame",
  "object",
  "embed",
  "applet",
  "noscript",
  "template",
  "svg",
  "math",
  "head",
  "title",
  "meta",
  "link",
  "base",
  "img",
  "picture",
  "video",
  "audio",
  "source",
  "track",
  "canvas",
  "form",
  "input",
  "button",
  "select",
  "option",
  "textarea",
  "details",
  "summary",
  "dialog",
  "marquee",
  "portal",
  "slot",
  "xmp",
  "plaintext",
]);

/** Classes that only carry machine data or editor artefacts. */
export const HIDDEN_CLASSES = new Set(["tp-vocab-data-payload", "ql-cursor"]);

export const BLANK_CLASSES = new Set(["tp-p6-blank", "tp-reading-blank-badge"]);

/** Wrappers the sources put around Part 7 documents; all get the same document frame. */
export const DOCUMENT_CLASSES = new Set([
  "info",
  "email",
  "article",
  "notice",
  "letter",
  "memo",
  "webpage",
  "passage",
  "advertisement",
  "ad",
  "review",
  "instructions",
  "information",
  "announcement",
  "form",
  "schedule",
]);

const KNOWN_TAGS = [...Object.keys(TAG_MAP), ...DROPPED_TAGS, "html", "body", "translation_split"];

const TAG_ALTERNATION = KNOWN_TAGS.join("|");

/** Any known tag, dropped ones included, so a lone "<img onerror=…>" is removed rather than shown. */
const MARKUP_HINT = new RegExp(`<\\/?(?:${TAG_ALTERNATION})(?=[\\s/>])[^>]*>`, "i");

/** A "<" that does not open a known tag is text, e.g. "Renata Alvarez <ralvarez@city.gov>". */
const STRAY_LESS_THAN = new RegExp(`<(?!!--|\\/?(?:${TAG_ALTERNATION})(?=[\\s/>]))`, "gi");

const TRANSLATION_MARKER = /<\s*translation_split\s*\/?\s*>/i;

export const isMarkup = (value: string) => MARKUP_HINT.test(value);

/** The API already splits translations out; this keeps an unsplit value from leaking one. */
export const withoutTranslation = (value: string) => value.split(TRANSLATION_MARKER)[0] ?? "";

/**
 * Parses markup into an inert document: scripts do not run and resources are not fetched.
 */
export function parseMarkup(value: string): HTMLElement {
  const escaped = withoutTranslation(value).replace(STRAY_LESS_THAN, "&lt;");
  return new DOMParser().parseFromString(`<!doctype html><body>${escaped}</body>`, "text/html")
    .body;
}

export interface VocabularyItem {
  word: string;
  pos?: string;
  ipa?: string;
  meaning?: string;
}

/**
 * Some explanations embed their vocabulary as a JSON array (Studychill flashcard data).
 * Returns null for anything that is not such an array, so normal text is left alone.
 */
export function parseVocabularyJson(text: string): VocabularyItem[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[{") || !trimmed.endsWith("}]")) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(trimmed);
    if (!Array.isArray(data)) {
      return null;
    }

    const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const items = data
      .filter(
        (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
      )
      .map((entry) => ({
        word: readString(entry.word),
        pos: readString(entry.pos),
        ipa: readString(entry.ipa_us) || readString(entry.ipa),
        meaning: readString(entry.meaning_vi) || readString(entry.meaning),
      }))
      .filter((item) => item.word);

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

/** Plain text from the sources still carries entities such as "&eacute;" or "&rsquo;". */
export function decodeEntities(value: string): string {
  if (!value.includes("&")) {
    return value;
  }
  return parseMarkup(value.replace(/</g, "&lt;")).textContent ?? "";
}

export function readBlankNumber(element: Element): number | null {
  const source = element.getAttribute("data-qnum") ?? element.textContent ?? "";
  const match = /\d{1,3}/.exec(source);
  return match ? Number(match[0]) : null;
}

export type TextToken =
  | { kind: "text"; value: string }
  | { kind: "strong" | "em"; value: string }
  | { kind: "blank"; number: number | null };

/**
 * Inline syntax found in the sources: **bold**, *italic* (titles, emphasis), numbered blanks
 * "____135____" / "______[135]" (Part 6), plain blanks "_____" and, optionally, "-------"
 * (Part 5/6 questions).
 */
export function tokenizeText(text: string, dashBlanks: boolean): TextToken[] {
  const pattern = new RegExp(
    [
      String.raw`\*\*([^*\n]+?)\*\*`,
      String.raw`(?<![*\w])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?![*\w])`,
      String.raw`_{2,}\s*(?:\[(\d{1,3})\]|\(?(\d{1,3})\)?\s*_{2,})`,
      String.raw`_{3,}`,
      dashBlanks ? String.raw`-{4,}` : null,
    ]
      .filter(Boolean)
      .join("|"),
    "g",
  );

  const tokens: TextToken[] = [];
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      tokens.push({ kind: "text", value: text.slice(last, index) });
    }

    if (match[1] !== undefined) {
      tokens.push({ kind: "strong", value: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ kind: "em", value: match[2] });
    } else if (match[3] !== undefined || match[4] !== undefined) {
      tokens.push({ kind: "blank", number: Number(match[3] ?? match[4]) });
    } else {
      tokens.push({ kind: "blank", number: null });
    }

    last = index + match[0].length;
  }

  if (last < text.length) {
    tokens.push({ kind: "text", value: text.slice(last) });
  }

  return tokens;
}

const MEDIA_SPLIT = /<\s*image_split\s*\/?\s*>/i;

/**
 * Media fields may hold several URLs joined by "<image_split>" (multi-page Part 7 scans).
 * Only absolute http(s) URLs are returned.
 */
export function mediaUrls(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(MEDIA_SPLIT)
    .map((item) => item.trim())
    .filter((item) => {
      try {
        const url = new URL(item);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    });
}

/** Speaker labels of listening scripts: "M-Au:", "W-Br:", "W:", "Man:", "Narrator:". */
export const SPEAKER_LABEL = /^((?:[MW](?:-[A-Za-z]{2})?|Man|Woman|Narrator|SCRIPT)\s*:)\s*/;

/**
 * Readable one-line text for lists and titles: markup, translation and markdown removed.
 */
export function toPlainText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  // Block boundaries become spaces so words of adjacent paragraphs do not run together.
  const text = isMarkup(value)
    ? (parseMarkup(value.replace(/<(?:br|\/(?:p|div|li|tr|td|th|h\d))\b[^>]*>/gi, " $&"))
        .textContent ?? "")
    : decodeEntities(withoutTranslation(value));

  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
