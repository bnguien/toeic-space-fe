/**
 * Word / phrase lookup of the reader (port of Studychill `api/dict.js`). Signed-in readers use the PBL-75
 * vocabulary lookup (fast tiers first, AI only when the fast result is incomplete); guests use the news guest
 * lookup, which never runs AI (`aiAllowed: false`, like Studychill's `ai_allowed`).
 */
import { vocabularyApi, type PartOfSpeech } from "@/modules/vocabulary";

import { newsApi } from "../api/news.api";
import type { NewsWordLookupDto } from "../types/news.types";

export interface LookupEntry {
  found: boolean;
  text: string;
  isPhrase: boolean;
  meaning: string;
  ipa: string;
  partOfSpeech: string;
  phraseType: string;
  complete: boolean;
  /** The server may run AI for this reader (signed in). */
  aiAllowed: boolean;
  officialWordId: string | null;
}

const MAX_CHARACTERS = 600;
const cache = new Map<string, LookupEntry>();
const inFlight = new Map<string, Promise<LookupEntry | null>>();

export const normalizeText = (text: string): string =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARACTERS);

const toEntry = (dto: NewsWordLookupDto, aiAllowed: boolean): LookupEntry => ({
  found: !!(dto.meaningVi || dto.phonetic || dto.partOfSpeech),
  text: dto.text,
  isPhrase: dto.kind === "phrase",
  meaning: dto.meaningVi ?? "",
  ipa: dto.phonetic ?? "",
  partOfSpeech: dto.partOfSpeech ? dto.partOfSpeech.toLowerCase() : "",
  phraseType: dto.phraseType ?? "",
  complete: dto.complete,
  aiAllowed,
  officialWordId: dto.officialWordId,
});

/**
 * Looks up a word or phrase. `ai: false` = fast tiers only. Found results are cached for the session; a complete
 * result serves both passes.
 */
export async function lookupWord(
  text: string,
  { context = "", ai = true, signedIn }: { context?: string; ai?: boolean; signedIn: boolean },
): Promise<LookupEntry | null> {
  const cleaned = normalizeText(text);
  if (!cleaned) return null;
  const fullKey = `${signedIn ? "u" : "g"}|${cleaned.toLowerCase()}`;
  const key = `${fullKey}${ai ? "" : "|fast"}`;
  const complete = cache.get(fullKey);
  if (complete?.complete) return complete;
  if (!ai && cache.has(key)) return cache.get(key) ?? null;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const dto = signedIn
      ? ((await vocabularyApi.lookup({
          text: cleaned,
          context: normalizeText(context),
          allowAi: ai,
        })) as NewsWordLookupDto)
      : await newsApi.lookupAsGuest({ text: cleaned, context: normalizeText(context) });
    const entry = toEntry(dto, signedIn);
    // Only found results are remembered: a network hiccup must not break a word for the whole session.
    if (entry.found) {
      cache.set(key, entry);
      if (entry.complete) cache.set(fullKey, entry);
    }
    return entry;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

const SHORT_POS: Record<string, PartOfSpeech> = {
  n: "noun",
  noun: "noun",
  v: "verb",
  verb: "verb",
  adj: "adjective",
  adjective: "adjective",
  adv: "adverb",
  adverb: "adverb",
  prep: "preposition",
  preposition: "preposition",
  conj: "conjunction",
  conjunction: "conjunction",
  pron: "pronoun",
  pronoun: "pronoun",
  det: "determiner",
  determiner: "determiner",
  phr: "phrase",
  phrase: "phrase",
  "cụm từ": "phrase",
};

/** Part of speech label (article vocabulary "n"/"adj" or lookup "noun") → the library enum. */
export const toPartOfSpeech = (label: string | undefined, isPhrase = false): PartOfSpeech =>
  isPhrase
    ? "phrase"
    : (SHORT_POS[
        String(label || "")
          .trim()
          .toLowerCase()
      ] ?? "other");
