/**
 * Browser storage of the news reader. Guests keep their reading state here; a signed-in learner's state lives on
 * the server and only the learner-wide reader settings are mirrored here. On sign-in the guest state is merged into
 * the account (useGuestReadingMerge) and removed from this browser.
 */
import type {
  DictationProgress,
  GuestReadingInput,
  NewsDictationEntryInput,
} from "../types/news.types";

const PREFIX = "ts_news_";

export const STORAGE_KEYS = {
  palette: `${PREFIX}palette`,
  panelWidth: `${PREFIX}panel_width`,
  mode: `${PREFIX}mode`,
  fontSize: `${PREFIX}font_size`,
  dark: `${PREFIX}dark`,
  layout: `${PREFIX}layout`,
  view: `${PREFIX}view`,
  hackMode: `${PREFIX}hack_mode`,
  split: `${PREFIX}split`,
  voice: `${PREFIX}voice`,
  /** When the reader settings above were last changed in this browser (ms). */
  settingsUpdatedAt: `${PREFIX}settings_updated_at`,
  /** {slug: ms} of the last guest write per article (newer copy wins on merge). */
  articleTimes: `${PREFIX}article_times`,
} as const;

type ArticleField = "known" | "time" | "note" | "dictation" | "done";
const ARTICLE_FIELDS: ArticleField[] = ["known", "time", "note", "dictation", "done"];

export const articleKey = (field: ArticleField, slug: string) => `${PREFIX}${field}_${slug}`;

export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked or full */
  }
}

const removeStored = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage blocked */
  }
};

/** Writes one guest field of an article and stamps the article's write time. */
export function writeArticleField(field: ArticleField, slug: string, value: unknown): void {
  writeStored(articleKey(field, slug), value);
  const times = readStored<Record<string, number>>(STORAGE_KEYS.articleTimes, {});
  times[slug] = Date.now();
  writeStored(STORAGE_KEYS.articleTimes, times);
}

/** Writes a reader setting and stamps when the settings changed. */
export function writeSetting(key: string, value: unknown): void {
  writeStored(key, value);
  writeStored(STORAGE_KEYS.settingsUpdatedAt, Date.now());
}

/** Guest progress of a card: done = 100, read for more than 20 seconds = 50, else 0. */
export const readingProgress = (slug: string): number =>
  readStored(articleKey("done", slug), 0)
    ? 100
    : readStored(articleKey("time", slug), 0) > 20
      ? 50
      : 0;

const toEntryInput = (record: DictationProgress[string]): NewsDictationEntryInput => ({
  passed: !!record.passed,
  unaided: !!record.unaided,
  revealed: !!record.revealed,
  attempts: record.attempts ?? 0,
  input: record.input ?? null,
});

/** Every article a guest touched in this browser, shaped for POST me/merge. */
export function collectGuestReadings(): GuestReadingInput[] {
  const slugs = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) ?? "";
      const match = /^ts_news_(known|time|note|dictation|done)_(.+)$/.exec(key);
      if (match) slugs.add(match[2]);
    }
  } catch {
    return [];
  }
  const times = readStored<Record<string, number>>(STORAGE_KEYS.articleTimes, {});
  return [...slugs].slice(0, 300).map((slug) => {
    const dictation = readStored<DictationProgress>(articleKey("dictation", slug), {});
    const known = readStored<string[] | null>(articleKey("known", slug), null);
    const note = readStored<string | null>(articleKey("note", slug), null);
    return {
      slug,
      readingSeconds: Math.max(0, Math.round(Number(readStored(articleKey("time", slug), 0)) || 0)),
      completed: !!readStored(articleKey("done", slug), 0),
      knownWords: known ?? undefined,
      notes: note ?? undefined,
      dictation: Object.fromEntries(
        Object.entries(dictation).map(([id, record]) => [id, toEntryInput(record)]),
      ),
      updatedAt: times[slug] ? new Date(times[slug]).toISOString() : undefined,
    };
  });
}

/** Removes the guest state of these articles (after it was merged into the account). */
export function clearGuestReadings(slugs: string[]): void {
  const times = readStored<Record<string, number>>(STORAGE_KEYS.articleTimes, {});
  slugs.forEach((slug) => {
    ARTICLE_FIELDS.forEach((field) => removeStored(articleKey(field, slug)));
    delete times[slug];
  });
  writeStored(STORAGE_KEYS.articleTimes, times);
}

export const dictationToInput = (
  progress: DictationProgress,
): Record<string, NewsDictationEntryInput> =>
  Object.fromEntries(Object.entries(progress).map(([id, record]) => [id, toEntryInput(record)]));
