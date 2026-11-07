// "Điền từ" mode: picks the words worth learning to hide and compares answers.
// Prefers C1+ > B2 > TOEIC/B1 (server `levels`) > long words; never hides function words, proper names, numbers,
// words with an apostrophe (don't) or sounds. Deterministic so blanks do not jump between renders.
import { cleanToken, markSoundTokens } from "./subtitle-reading";

const FUNCTION_WORDS = new Set(
  [
    "a an the and or but so if then than that this these those there here what which who whom",
    "whose when where why how me my mine you your yours he him his she her hers its we us our ours they them their theirs",
    "myself yourself himself herself itself ourselves themselves is am are was were be been being do does did done doing",
    "have has had having will would shall should can could may might must not no nor yes to of in on at by for with from up",
    "down out off over under into onto about as just also too very all any some each every both few more most other such",
    "only own same again once oh okay yeah well like gonna wanna gotta let get got go going went come came say said said",
    "know think thing things really right yes yeah because",
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean),
);

const CEFR_SCORES: Record<string, number> = { C2: 5, C1: 5, B2: 4, B1: 3, TOEIC: 3 };
const WORD_PATTERN = /^[A-Za-z][A-Za-z-]*[A-Za-z]$/;
const SENTENCE_END = /[.?!…]["')\]]*$/;

/** Number of blanks by sentence length: short 1, medium 2, long 3. */
export function blankCount(wordCount: number): number {
  if (wordCount < 4) return 0;
  if (wordCount < 8) return 1;
  if (wordCount < 14) return 2;
  return 3;
}

/** Indices of the tokens hidden in one cue (ascending). */
export function pickHiddenTokens(text: string, levels: Record<string, string> = {}): number[] {
  const tokens = String(text || "").split(" ");
  const sfx = markSoundTokens(tokens);
  const candidates: { i: number; score: number }[] = [];
  let wordCount = 0;
  tokens.forEach((tok, i) => {
    if (sfx[i]) return;
    const cleanWord = cleanToken(tok);
    if (!cleanWord) return;
    wordCount += 1;
    if (cleanWord.length < 3 || !WORD_PATTERN.test(cleanWord)) return;
    const lower = cleanWord.toLowerCase();
    if (FUNCTION_WORDS.has(lower)) return;
    const atSentenceStart = i === 0 || SENTENCE_END.test(tokens[i - 1] || "");
    if (!atSentenceStart && cleanWord[0] !== cleanWord[0].toLowerCase()) return; // proper name mid-sentence
    const score =
      CEFR_SCORES[(levels && levels[lower]) || ""] ||
      (cleanWord.length >= 7 ? 2 : cleanWord.length >= 5 ? 1.5 : 1);
    candidates.push({ i, score });
  });
  const needed = Math.min(blankCount(wordCount), candidates.length);
  if (!needed) return [];
  candidates.sort((a, b) => b.score - a.score || a.i - b.i);
  const picked: number[] = [];
  // Avoid two adjacent blanks (hard to hear a whole phrase); accept them only when nothing else is left.
  candidates.forEach((u) => {
    if (picked.length < needed && !picked.some((c) => Math.abs(c - u.i) === 1)) picked.push(u.i);
  });
  candidates.forEach((u) => {
    if (picked.length < needed && !picked.includes(u.i)) picked.push(u.i);
  });
  return picked.sort((a, b) => a - b);
}

/** Normalises for comparison: case, punctuation, curly quotes and diacritics are ignored. */
export function normalizeGuess(s: string | null | undefined): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9']/g, "");
}

export function isCorrectWord(typed: string | null | undefined, answer: string): boolean {
  const a = normalizeGuess(typed);
  return !!a && a === normalizeGuess(answer);
}

/** Splits a token into [before, word, after] so punctuation stays outside the blank ("store." → "store" + "."). */
export function splitToken(tok: string): [string, string, string] {
  const cleanWord = cleanToken(tok);
  const i = cleanWord ? tok.indexOf(cleanWord) : -1;
  if (i < 0) return ["", tok, ""];
  return [tok.slice(0, i), cleanWord, tok.slice(i + cleanWord.length)];
}
