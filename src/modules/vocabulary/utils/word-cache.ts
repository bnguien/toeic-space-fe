import type { QueryClient } from "@tanstack/react-query";

import { vocabularyQueryKeys } from "../api/vocabulary.query-keys";
import type { WordDto } from "../types/vocabulary.types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;

const isWord = (value: Record<string, unknown>): boolean =>
  typeof value.id === "string" &&
  typeof value.headword === "string" &&
  typeof value.meaningVi === "string";

const isQuizQuestion = (value: Record<string, unknown>): boolean =>
  typeof value.wordId === "string" && typeof value.prompt === "string";

/**
 * Returns `value` with every copy of `word` replaced (words in lists, queues, sessions, quiz
 * prompts) and, when given, the entry's `savedWordId` filled. Unchanged branches keep their
 * reference so TanStack Query does not re-render them.
 */
function replaceWord(value: unknown, word: WordDto, savedWordId: string | null): unknown {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const replaced = replaceWord(item, word, savedWordId);
      if (replaced !== item) changed = true;
      return replaced;
    });
    return changed ? next : value;
  }
  if (!isPlainObject(value)) return value;

  if (isWord(value)) return value.id === word.id ? { ...value, ...word } : value;
  if (isQuizQuestion(value)) {
    return value.wordId === word.id
      ? { ...value, prompt: word.meaningVi, partOfSpeech: word.partOfSpeech }
      : value;
  }

  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const replaced = replaceWord(child, word, savedWordId);
    if (replaced !== child) changed = true;
    next[key] = replaced;
  }
  const ofWord = isPlainObject(next.word) && next.word.id === word.id;
  // A study item / mistake row of this word that was not in the library yet.
  if (ofWord && savedWordId && "savedWordId" in next && next.savedWordId === null) {
    next.savedWordId = savedWordId;
    changed = true;
  }
  // A library entry keeps the note next to the word.
  if (ofWord && "note" in next && "isCustom" in next && next.note !== (word.note ?? null)) {
    next.note = word.note ?? null;
    changed = true;
  }
  return changed ? next : value;
}

/** Patches a learner's edited word into every cached vocabulary response. */
export function patchWordInCaches(
  queryClient: QueryClient,
  word: WordDto,
  savedWordId: string | null = null,
) {
  queryClient.setQueriesData({ queryKey: vocabularyQueryKeys.all }, (data: unknown) =>
    data === undefined ? data : replaceWord(data, word, savedWordId),
  );
}
