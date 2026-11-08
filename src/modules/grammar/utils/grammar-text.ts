/**
 * Text helpers of the grammar page (pure, no React). Highlight / review-question rules follow the PDF renderer so the
 * web and the handouts match. Port of Studychill `grammarText.js`.
 */

export const LETTERS = ["A", "B", "C", "D"];
export const BLANK = "-------";

export const pad2 = (n: number | string): string => String(n).padStart(2, "0");
export const topicCode = (topicNum: number | string): string => `CĐ${pad2(topicNum)}`;

/** 'CĐ20.4' → 20; not a code → null. */
export function topicOfCode(code: string | null | undefined): number | null {
  const m = /^CĐ\s*(\d+)/.exec(code || "");
  return m ? Number(m[1]) : null;
}

export interface ParsedCode {
  topic: number;
  unitIndex: number;
  subIndex: number | null;
}

/** Unit code 'CĐ04.2.1' → topic 4, unit index 1, sub-item index 0 (0-based; sub-item null for a unit). */
export function parseCode(code: string | null | undefined): ParsedCode | null {
  const m = /^CĐ(\d+)\.(\d+)(?:\.(\d+))?$/.exec(code || "");
  if (!m) return null;
  return {
    topic: Number(m[1]),
    unitIndex: Number(m[2]) - 1,
    subIndex: m[3] ? Number(m[3]) - 1 : null,
  };
}

const isWordChar = (ch: string | undefined): boolean => /[\p{L}\p{N}]/u.test(ch || "");

/**
 * Position of `phrase` in `text` (from `pos`), preferring a whole-word match: “on” never matches inside “session”.
 * Without a whole-word match falls back to a plain match; not found → -1. (find_phrase of the PDF renderer.)
 */
export function findPhrase(text: string, phrase: string, pos = 0): number {
  if (!phrase) return -1;
  let i = text.indexOf(phrase, pos);
  const startIsWord = isWordChar(phrase[0]);
  const endIsWord = isWordChar(phrase[phrase.length - 1]);
  while (i >= 0) {
    const before = text[i - 1];
    const after = text[i + phrase.length];
    if ((!startIsWord || !isWordChar(before)) && (!endIsWord || !isWordChar(after))) return i;
    i = text.indexOf(phrase, i + 1);
  }
  return text.indexOf(phrase, pos);
}

/** Splits an example into [before, highlight, after]; highlight not found → null. */
export function splitHighlight(
  sentence: string,
  highlight: string | null | undefined,
): [string, string, string] | null {
  const i = highlight ? findPhrase(sentence, highlight) : -1;
  if (i < 0 || !highlight) return null;
  return [
    sentence.slice(0, i),
    sentence.slice(i, i + highlight.length),
    sentence.slice(i + highlight.length),
  ];
}

// ---- Highlight the entry word in vocabulary examples, inflected forms included (port of highlight_word) ----

function inflections(word: string): Set<string> {
  const w = word.toLowerCase();
  const f = new Set([w, `${w}s`, `${w}es`, `${w}ed`, `${w}d`, `${w}ing`, `${w}er`, `${w}ly`]);
  const vowels = "aeiou";
  if (w.endsWith("y") && w.length > 2 && !vowels.includes(w.at(-2) as string)) {
    const g = w.slice(0, -1);
    ["ied", "ies", "ier", "ily"].forEach((d) => f.add(g + d));
  }
  if (w.endsWith("e")) {
    f.add(`${w.slice(0, -1)}ing`);
    f.add(`${w.slice(0, -1)}ed`);
  }
  if (
    w.length >= 3 &&
    "bdgklmnprt".includes(w.at(-1) as string) &&
    vowels.includes(w.at(-2) as string) &&
    !vowels.includes(w.at(-3) as string)
  ) {
    const c = w.at(-1);
    [`${w}${c}ed`, `${w}${c}ing`, `${w}${c}er`].forEach((x) => f.add(x));
  }
  if (w.endsWith("f")) f.add(`${w.slice(0, -1)}ves`);
  if (w.endsWith("fe")) f.add(`${w.slice(0, -2)}ves`);
  if (w.endsWith("ie")) f.add(`${w.slice(0, -2)}ying`);
  return f;
}

const IRREGULAR_FORMS = `be,is,are,was,were,been,being begin,began,begun bring,brought build,built buy,bought choose,chose,chosen
come,came cost do,did,done,does draw,drew,drawn drive,drove,driven eat,ate,eaten fall,fell,fallen feel,felt find,found
fly,flew,flown forget,forgot,forgotten get,got,gotten give,gave,given go,went,gone,goes grow,grew,grown have,had,has
hold,held keep,kept know,knew,known lead,led leave,left lend,lent lose,lost make,made mean,meant meet,met pay,paid
rise,rose,risen run,ran say,said see,saw,seen sell,sold send,sent set shut speak,spoke,spoken spend,spent stand,stood
take,took,taken teach,taught tell,told think,thought understand,understood wear,wore,worn win,won write,wrote,written
withdraw,withdrew,withdrawn undertake,undertook,undertaken oversee,oversaw,overseen arise,arose,arisen seek,sought
forecast,forecasted bid,bidding hire,hired person,people child,children man,men woman,women analysis,analyses`;

const IRREGULAR = new Map<string, Set<string>>();
IRREGULAR_FORMS.split(/\s+/).forEach((entry) => {
  const forms = entry.split(",");
  IRREGULAR.set(forms[0], new Set(forms));
});

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Range [start, end) of the entry `term` in sentence `en` (inflected forms too; words of a phrase may be up to 2 words
 * apart); when the phrase does not match as a whole the first word is highlighted. Not found → null.
 */
export function findEntrySpan(sentence: string, term: string): [number, number] | null {
  const words = String(term || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;
  const head = words[0].replace(/[()]/g, "");
  const forms = new Set([...inflections(head), ...(IRREGULAR.get(head.toLowerCase()) || [])]);
  const formsPattern = [...forms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
  const rest = words
    .slice(1)
    .map((x) => String.raw`\W+(?:\w+\W+){0,2}?` + escapeRe(x))
    .join("");
  let m = new RegExp(String.raw`\b(?:${formsPattern})${rest}\b`, "i").exec(sentence);
  if (!m && words.length > 1)
    m = new RegExp(String.raw`\b(?:${formsPattern})\b`, "i").exec(sentence);
  return m ? [m.index, m.index + m[0].length] : null;
}

/** Straight "…" pairs → “…” (one quote style in explanations, like the PDF). */
export function curlyQuotes(s: unknown): string {
  return String(s ?? "").replace(/"([^"\n]*)"/g, "“$1”");
}

export interface ReviewKind {
  kind: "review" | "spiral" | null;
  olderTopics: number[];
}

interface ReviewableQuestion {
  unitCodes?: string[];
  recall?: string[];
  subQuestions?: { recall?: string[] }[];
}

/**
 * Spiral classification (review_kind of the PDF renderer). `home`: topic numbers "of this lesson" (topic: {n};
 * stage test: the topics of the stage).
 * - { kind: "review" }                  review question: main unit code outside home → label “câu ôn”.
 * - { kind: "spiral", olderTopics: [n…] } main code in home, recall has older topics → “↺ kết hợp CĐxx”.
 * - { kind: null }                      regular question.
 */
export function reviewKind(
  q: ReviewableQuestion,
  home: Set<number> | null | undefined,
): ReviewKind {
  const nl = [...(q.recall || [])];
  (q.subQuestions || []).forEach((s) => nl.push(...(s.recall || [])));
  const mainTopic = topicOfCode((q.unitCodes || [])[0]);
  if (!home || mainTopic === null)
    return nl.length ? { kind: "review", olderTopics: [] } : { kind: null, olderTopics: [] };
  if (!home.has(mainTopic)) return { kind: "review", olderTopics: [] };
  const olderTopics = [
    ...new Set(nl.map(topicOfCode).filter((c): c is number => c !== null && !home.has(c))),
  ].sort((a, b) => a - b);
  return olderTopics.length ? { kind: "spiral", olderTopics } : { kind: null, olderTopics: [] };
}

/** Scored questions of an item: a Part 6 passage (cloze6) = 4 questions. */
export const questionCount = (q: { kind?: string; subQuestions?: unknown[] }): number =>
  q.kind === "cloze6" ? q.subQuestions?.length || 4 : 1;

/** Option columns like the PDF: ≤ 17 chars → 4 columns, ≤ 40 → 2, longer → 1. */
export function optionColumns(options: string[]): 1 | 2 | 4 {
  const maxLen = Math.max(...options.map((o) => o.length));
  if (maxLen <= 17) return 4;
  return maxLen <= 40 ? 2 : 1;
}
