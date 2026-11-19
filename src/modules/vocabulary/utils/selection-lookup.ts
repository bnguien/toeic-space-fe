/**
 * Client side of "select text to look it up" (port of Studychill `api/dict.js`).
 *
 * The tier order (cache → catalog → dictionary / translation → AI) lives on the server; the browser never calls a
 * dictionary or translation service directly, so every learner shares one server cache.
 */
import { dictionaryApi } from "../api/dictionary.api";
import type { SelectionLookupDto } from "../types/dictionary.types";

/** Longest selection sent to the server (same cap as the API). */
export const MAX_SELECTION_CHARACTERS = 600;

/** Session cache: selecting the same word five times costs one request. */
const lookupCache = new Map<string, SelectionLookupDto>();
/** Requests in flight, so two identical selections never become two requests. */
const inFlight = new Map<string, Promise<SelectionLookupDto | null>>();

/** Collapses whitespace and caps the length — the cache key, same shape as the server's. */
export const normalizeText = (text: string): string =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SELECTION_CHARACTERS);

/** Number of word tokens: 1 = a word, more = a phrase or a sentence. */
export const countWords = (text: string): number =>
  (String(text || "").match(/[A-Za-zÀ-ɏ0-9'’-]+/g) || []).length;

/** A 2–5 word chunk without sentence punctuation inside: an idiom / collocation candidate. */
export function isFixedPhrase(text: string): boolean {
  const trimmed = normalizeText(text).replace(/^[\s.!?,;:"“”‘’']+|[\s.!?,;:"“”‘’']+$/g, "");
  if (!trimmed || /[.!?;]/.test(trimmed)) return false;
  const words = countWords(trimmed);
  return words >= 2 && words <= 5;
}

/** Whether the entry is good enough; only an incomplete one is worth the slower AI pass. */
export function isCompleteEntry(entry: SelectionLookupDto | null | undefined): boolean {
  if (!entry || !entry.found) return false;
  if (entry.kind === "sentence") return !!entry.meaning;
  if (entry.kind === "phrase") {
    if (!entry.meaning) return false;
    // A short phrase the AI has not classified yet may only carry a word-by-word machine translation.
    return isFixedPhrase(entry.text) ? !!entry.phraseType : true;
  }
  return !!(entry.meaning && (entry.phonetic || entry.partOfSpeech));
}

/**
 * Looks up a selected text. `ai: false` runs the fast tiers only. Found results are cached for the session; a
 * complete result serves both passes.
 */
export async function lookupSelection(
  text: string,
  { context = "", ai = true }: { context?: string; ai?: boolean } = {},
): Promise<SelectionLookupDto | null> {
  const cleaned = normalizeText(text);
  if (!cleaned) return null;

  const fullKey = cleaned.toLowerCase();
  const cacheKey = `${fullKey}${ai ? "" : "|fast"}`;
  const complete = lookupCache.get(fullKey);
  if (complete && isCompleteEntry(complete)) return complete;
  if (!ai && lookupCache.has(cacheKey)) return lookupCache.get(cacheKey) ?? null;
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const result = await dictionaryApi.lookupSelection({
      text: cleaned,
      context: normalizeText(context),
      allowAi: ai,
    });
    // Only found results are remembered: a network hiccup must not break a word for the whole session.
    if (result?.found) {
      lookupCache.set(cacheKey, result);
      if (isCompleteEntry(result)) lookupCache.set(fullKey, result);
    }
    return result ?? null;
  })().finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, request);
  return request;
}

/** Forgets a looked-up text (after the learner saved or edited it) so the next lookup reads the new state. */
export function forgetLookup(text: string): void {
  const baseKey = normalizeText(text).toLowerCase();
  if (!baseKey) return;
  lookupCache.delete(baseKey);
  lookupCache.delete(`${baseKey}|fast`);
}
