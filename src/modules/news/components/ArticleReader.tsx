import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { CheckCircle2, Clock, Image as ImageIcon, Pause, Volume2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";

import { useCreateCustomWord, useSaveWord } from "@/modules/vocabulary";

import { newsApi } from "../api/news.api";
import { useReadAloud } from "../hooks/useReadAloud";
import { useReadingSync } from "../hooks/useReadingSync";
import type {
  BilingualLayout,
  BrainHackModeKey,
  DictationProgress,
  DictationRecord,
  LookedUpWord,
  NewsArticle,
  NewsReaderSettingsDto,
  NewsReadingStateDto,
  NewsSentenceDto,
  NewsVocabularyItemDto,
  TranslationMode,
} from "../types/news.types";
import { stageLabel } from "../utils/news-catalog";
import {
  attachVocabulary,
  BRAIN_HACK_MODES,
  buildVocabularyIndex,
  clampPanelWidth,
  clampSplit,
  countArticleWords,
  countOccurrences,
  findPhraseSpan,
  formatDuration,
  indexSentence,
  normalizeToken,
  pickPalette,
  readingSpeed,
  shortMeaning,
  splitWords,
  TRANSLATION_MODES,
  type MatchedToken,
  type PhraseSpan,
} from "../utils/news-reader";
import {
  articleKey,
  readStored,
  STORAGE_KEYS,
  writeArticleField,
  writeSetting,
  writeStored,
} from "../utils/news-storage";
import { lookupWord, toPartOfSpeech, type LookupEntry } from "../utils/word-lookup";
import styles from "./ArticleReader.module.css";
import { BrainHackMode, type MemorizedWord } from "./BrainHackMode";
import { DictionaryLookup } from "./DictionaryLookup";
import { ReaderSentence, type LookedUpPhrase, type ReaderView } from "./ReaderSentence";
import sentenceStyles from "./ReaderSentence.module.css";
import { ReaderSidePanel, type PanelTab } from "./ReaderSidePanel";
import { ReaderTopBar } from "./ReaderTopBar";
import { ReaderViewBar } from "./ReaderViewBar";
import { ReadingSummary } from "./ReadingSummary";
import { WordCard } from "./WordCard";

/** Karaoke, auto-scroll and speak-on-click are always on; the vocabulary layers and meanings are the learner's. */
const DEFAULT_VIEW: ReaderView = {
  suggested: true,
  lookedUp: true,
  meaning: true,
  karaoke: true,
  autoScroll: true,
  speakOnClick: true,
};
/** Seconds without input before the reading clock pauses ("away from the desk"). */
const IDLE_AFTER_SECONDS = 60;
const DEFAULT_PANEL_WIDTH = 340;
const DEFAULT_SPLIT = 52;
const DICTIONARY_LABEL = "Từ điển TOEIC Space";
const PREPARED_LABEL = "Từ vựng soạn sẵn của bài";
const SERVER_TIME_EVERY_SECONDS = 15;

const fromServerDictation = (state: NewsReadingStateDto): DictationProgress =>
  Object.fromEntries(
    Object.entries(state.dictation).map(([id, x]) => [
      id,
      {
        passed: x.passed,
        unaided: x.unaided,
        revealed: x.revealed,
        attempts: x.attempts,
        input: x.input ?? undefined,
        result: x.result ?? undefined,
      } satisfies DictationRecord,
    ]),
  );

interface ArticleReaderProps {
  article: NewsArticle;
  signedIn: boolean;
  /** The signed-in learner's state from `open` (null for guests or when it failed). */
  initialState: NewsReadingStateDto | null;
  /** The reader settings of this browser are newer than the server copy: push them once. */
  pushLocalSettings: boolean;
}

/**
 * Full-screen reader of one article: reading column | draggable splitter | stats & vocabulary panel. A random text
 * palette on every open (the paper stays). Signed-in learners' progress, known words, notes, dictation and settings
 * are saved on the server; guests keep them in this browser.
 */
export function ArticleReader({
  article,
  signedIn,
  initialState,
  pushLocalSettings,
}: ArticleReaderProps) {
  const slug = article.slug;
  const navigate = useNavigate();
  const sync = useReadingSync(slug, signedIn);
  const saveWordMutation = useSaveWord();
  const createCustomWord = useCreateCustomWord();

  useEffect(() => {
    document.title = `${article.titleEn} — Đọc báo song ngữ | TOEIC Space`;
  }, [article.titleEn]);

  /* ---------- settings ---------- */
  const [palette, setPalette] = useState(() => pickPalette(readStored(STORAGE_KEYS.palette, "")));
  const [dark, setDark] = useState(() => readStored(STORAGE_KEYS.dark, false));
  const [split, setSplit] = useState(() =>
    clampSplit(readStored(STORAGE_KEYS.split, DEFAULT_SPLIT)),
  );
  const [layout, setLayout] = useState<BilingualLayout>(() =>
    readStored<string>(STORAGE_KEYS.layout, "columns") === "inline" ? "inline" : "columns",
  );
  const [view, setView] = useState<ReaderView>(() => {
    const stored = readStored<Partial<ReaderView>>(STORAGE_KEYS.view, {});
    return {
      ...DEFAULT_VIEW,
      suggested: stored.suggested ?? true,
      lookedUp: stored.lookedUp ?? true,
      meaning: stored.meaning ?? true,
    };
  });
  const [mode, setMode] = useState<TranslationMode>(() =>
    readStored<string>(STORAGE_KEYS.mode, "english") === "bilingual" ? "bilingual" : "english",
  );
  const [fontSize, setFontSize] = useState(() => readStored(STORAGE_KEYS.fontSize, 19));
  const [panelWidth, setPanelWidth] = useState(() =>
    readStored(STORAGE_KEYS.panelWidth, DEFAULT_PANEL_WIDTH),
  );
  const [brainHackMode, setBrainHackMode] = useState<BrainHackModeKey>(() => {
    const stored = readStored<string>(STORAGE_KEYS.hackMode, "english");
    return BRAIN_HACK_MODES.some((x) => x.key === stored)
      ? (stored as BrainHackModeKey)
      : "english";
  });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /** Learner-wide settings as sent to the server. */
  const settings = useMemo<NewsReaderSettingsDto>(
    () => ({
      palette: palette.key,
      mode,
      layout,
      fontSize,
      dark,
      panelWidth,
      split,
      showSuggested: view.suggested,
      showLookedUp: view.lookedUp,
      showMeaning: view.meaning,
      hackMode: brainHackMode,
      voice: readStored<string>(STORAGE_KEYS.voice, "") || null,
    }),
    [
      palette.key,
      mode,
      layout,
      fontSize,
      dark,
      panelWidth,
      split,
      view.suggested,
      view.lookedUp,
      view.meaning,
      brainHackMode,
    ],
  );
  const settingsReady = useRef(false);
  useEffect(() => {
    // Mirror every change in this browser; the server copy follows (the first render only when local is newer).
    if (!settingsReady.current) {
      settingsReady.current = true;
      writeStored(STORAGE_KEYS.palette, palette.key);
      if (pushLocalSettings) sync.save({ settings });
      return;
    }
    sync.save({ settings });
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((key: string, value: unknown) => writeSetting(key, value), []);
  useEffect(() => persist(STORAGE_KEYS.palette, palette.key), [palette, persist]);
  useEffect(() => persist(STORAGE_KEYS.mode, mode), [mode, persist]);
  useEffect(() => persist(STORAGE_KEYS.fontSize, fontSize), [fontSize, persist]);
  useEffect(() => persist(STORAGE_KEYS.dark, dark), [dark, persist]);
  useEffect(() => persist(STORAGE_KEYS.layout, layout), [layout, persist]);
  useEffect(
    () =>
      persist(STORAGE_KEYS.view, {
        suggested: view.suggested,
        lookedUp: view.lookedUp,
        meaning: view.meaning,
      }),
    [view, persist],
  );

  const toggleView = (key: "suggested" | "lookedUp" | "meaning") =>
    setView((v) => ({ ...v, [key]: !v[key] }));

  /* ---------- fullscreen ---------- */
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  /* ---------- reading state ---------- */
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("words");
  const [vocabularyFilter, setVocabularyFilter] = useState("");
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [popover, setPopover] = useState<LookedUpWord | null>(null);
  const [lookedUpWords, setLookedUpWords] = useState<LookedUpWord[]>([]);
  const [lookedUpPositions, setLookedUpPositions] = useState<Map<string, Set<number>>>(
    () => new Map(),
  );
  const [lookedUpPhrases, setLookedUpPhrases] = useState<Record<string, LookedUpPhrase[]>>({});
  const lookedUpPositionsRef = useRef(lookedUpPositions);
  useEffect(() => {
    lookedUpPositionsRef.current = lookedUpPositions;
  }, [lookedUpPositions]);
  const [savedWords, setSavedWords] = useState<Set<string>>(() => new Set());
  const [knownWords, setKnownWords] = useState<Set<string>>(
    () =>
      new Set(
        signedIn && initialState
          ? initialState.knownWords
          : readStored<string[]>(articleKey("known", slug), []),
      ),
  );
  const [seconds, setSeconds] = useState(() =>
    signedIn && initialState
      ? initialState.readingSeconds
      : readStored(articleKey("time", slug), 0),
  );
  const [idle, setIdle] = useState(false);
  const [percentRead, setPercentRead] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [notes, setNotes] = useState(() =>
    signedIn && initialState ? initialState.notes : readStored(articleKey("note", slug), ""),
  );
  const [done, setDone] = useState(() => !!initialState?.done);
  const [submitting, setSubmitting] = useState(false);
  const [brainHackOn, setBrainHackOn] = useState(false);
  const [dictation, setDictation] = useState<DictationProgress>(() =>
    signedIn && initialState
      ? fromServerDictation(initialState)
      : readStored(articleKey("dictation", slug), {}),
  );
  const brainHackOnRef = useRef(false);
  useEffect(() => {
    brainHackOnRef.current = brainHackOn;
  }, [brainHackOn]);

  // Guests keep their state here; signed-in learners save it on the server (debounced).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) return;
    if (signedIn) sync.save({ knownWords: [...knownWords] });
    else writeArticleField("known", slug, [...knownWords]);
  }, [knownWords]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (firstRender.current) return;
    if (signedIn) sync.save({ notes });
    else writeArticleField("note", slug, notes);
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (firstRender.current) return;
    if (!signedIn) writeArticleField("dictation", slug, dictation);
  }, [dictation]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (firstRender.current) return;
    if (signedIn) {
      if (seconds % SERVER_TIME_EVERY_SECONDS === 0) sync.save({ readingSeconds: seconds }, true);
    } else if (seconds % 5 === 0) writeArticleField("time", slug, seconds);
  }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    firstRender.current = false;
  }, []);
  const secondsRef = useRef(seconds);
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);
  useEffect(
    () => () => {
      // Leaving the article: last reading-clock value.
      if (signedIn) sync.save({ readingSeconds: secondsRef.current }, true);
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const lookedUpMeanings = useMemo(
    () => new Map(lookedUpWords.map((x) => [normalizeToken(x.word), x.meaning || ""])),
    [lookedUpWords],
  );
  const lookedUpMeaningsRef = useRef(lookedUpMeanings);
  useEffect(() => {
    lookedUpMeaningsRef.current = lookedUpMeanings;
  }, [lookedUpMeanings]);
  const sentences = useMemo(() => article.paragraphs.flatMap((p) => p.sentences), [article]);
  const sentenceIndex = useMemo(() => new Map(sentences.map((s, i) => [s.id, i])), [sentences]);
  const articleRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef(0);
  const toastTimerRef = useRef(0);
  const resumeAfterPopoverRef = useRef(false);
  const readAloud = useReadAloud(
    sentences,
    useCallback(() => articleRef.current, []),
    useCallback((voice: string) => writeSetting(STORAGE_KEYS.voice, voice), []),
  );

  const vocabularyIndex = useMemo(() => buildVocabularyIndex(article.vocabulary), [article]);
  const vocabularyIndexRef = useRef(vocabularyIndex);
  useEffect(() => {
    vocabularyIndexRef.current = vocabularyIndex;
  }, [vocabularyIndex]);
  const occurrences = useMemo(
    () => countOccurrences(article.paragraphs, article.vocabulary),
    [article],
  );
  const wordCount = useMemo(() => countArticleWords(article.paragraphs), [article]);
  const wpm = readingSpeed(wordCount, percentRead, seconds);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const { setSingleSentence } = readAloud;
  useEffect(() => {
    writeSetting(STORAGE_KEYS.hackMode, brainHackMode);
    setSingleSentence(brainHackOn && brainHackMode === "dictation");
  }, [brainHackOn, brainHackMode, setSingleSentence]);

  /* ---------- splitters ---------- */
  // Column divider (two-column layout): drag, ← → while focused (±2), double-click back to 52%.
  const onSplitDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const frame = columnsRef.current?.getBoundingClientRect();
    if (!frame) return;
    const el = event.currentTarget;
    el.setPointerCapture(event.pointerId);
    const onMove = (e: globalThis.PointerEvent) =>
      setSplit(clampSplit(((e.clientX - frame.left) / frame.width) * 100));
    const release = (e: globalThis.PointerEvent) => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      setSplit((value) => {
        writeSetting(STORAGE_KEYS.split, value);
        return value;
      });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
  };
  const onSplitKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    setSplit((value) => {
      const next = clampSplit(value + (event.key === "ArrowLeft" ? -2 : 2));
      writeSetting(STORAGE_KEYS.split, next);
      return next;
    });
  };

  // Side panel splitter: drag only while the button is held; ← → ±24 px; double-click back to 340.
  const onPanelDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = event.currentTarget;
    const frame = el.parentElement!.getBoundingClientRect();
    el.setPointerCapture(event.pointerId);
    const onMove = (e: globalThis.PointerEvent) =>
      setPanelWidth(clampPanelWidth(frame.right - e.clientX, frame.width));
    const release = (e: globalThis.PointerEvent) => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      setPanelWidth((value) => {
        writeSetting(STORAGE_KEYS.panelWidth, value);
        return value;
      });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
  };
  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const frameWidth = event.currentTarget.parentElement!.getBoundingClientRect().width;
    setPanelWidth((value) => {
      const next = clampPanelWidth(value + (event.key === "ArrowLeft" ? 24 : -24), frameWidth);
      writeSetting(STORAGE_KEYS.panelWidth, next);
      return next;
    });
  };

  /* ---------- reading clock (pauses after 60 s without input or when the tab is hidden) ---------- */
  useEffect(() => {
    activityRef.current = performance.now();
    const markActive = () => {
      activityRef.current = performance.now();
    };
    const events = ["pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((name) =>
      window.addEventListener(name, markActive, { passive: true, capture: true }),
    );
    const timer = window.setInterval(() => {
      const isIdle =
        document.hidden || performance.now() - activityRef.current > IDLE_AFTER_SECONDS * 1000;
      setIdle(isIdle);
      if (!isIdle && !summaryOpen) setSeconds((value) => value + 1);
    }, 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, markActive, { capture: true }));
    };
  }, [summaryOpen]);

  // % read: desktop scrolls inside the reading column; mobile scrolls the page.
  const measureProgress = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight + 2) {
      const max = el.scrollHeight - el.clientHeight;
      setPercentRead(Math.min(100, Math.round((el.scrollTop / max) * 100)));
      return;
    }
    const rect = articleRef.current?.getBoundingClientRect();
    if (!rect) return;
    const max = rect.height - window.innerHeight;
    setPercentRead(
      max <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((-rect.top / max) * 100))),
    );
  }, []);
  useEffect(() => {
    window.addEventListener("scroll", measureProgress, { passive: true });
    return () => window.removeEventListener("scroll", measureProgress);
  }, [measureProgress]);

  /* ---------- keyboard shortcuts ---------- */
  const readAloudRef = useRef(readAloud);
  useEffect(() => {
    readAloudRef.current = readAloud;
  });
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as Element | null;
      if (
        target?.closest?.('input, textarea, select, [contenteditable="true"]') ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const key = event.key.toLowerCase();
      const player = readAloudRef.current;
      if (key === "escape") {
        setPopover(null);
        setSummaryOpen(false);
        setSheetOpen(false);
        setDictionaryOpen(false);
      } else if (key === " " || key === "spacebar") {
        event.preventDefault();
        player.togglePlay();
      } else if (key === "arrowleft") {
        // Hack não: previous / next sentence; otherwise seek 3 seconds.
        event.preventDefault();
        if (brainHackOnRef.current)
          player.playFromSentence(Math.max(0, player.position.sentence - 1));
        else player.seek(-3);
      } else if (key === "arrowright") {
        event.preventDefault();
        if (brainHackOnRef.current) player.playFromSentence(player.position.sentence + 1);
        else player.seek(3);
      } else if (key === "r") player.replaySentence();
      else if (key === "t")
        setMode(
          (current) =>
            TRANSLATION_MODES[
              (TRANSLATION_MODES.findIndex((x) => x.key === current) + 1) % TRANSLATION_MODES.length
            ].key,
        );
      else if (key === "=" || key === "+") setFontSize((n) => Math.min(26, n + 1));
      else if (key === "-") setFontSize((n) => Math.max(15, n - 1));
      else if (key === "f") toggleFullscreen();
      else if (key === "l") {
        setMode("bilingual");
        setLayout((current) => (current === "columns" ? "inline" : "columns"));
      } else if (key === "d") {
        event.preventDefault();
        setDictionaryOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  /* ---------- lookup ---------- */
  const addLookedUp = useCallback(
    (word: LookedUpWord) =>
      setLookedUpWords((list) => [word, ...list.filter((x) => x.word !== word.word)]),
    [],
  );

  /** Looks up a whole phrase (fast pass, AI only when it has no meaning) → phrase, card and "Đã tra" list. */
  const lookupPhrase = useCallback(
    (sentence: NewsSentenceDto, span: PhraseSpan, rect: DOMRect) => {
      const apply = (entry: LookupEntry | null, pending: boolean) => {
        let meaning = entry?.meaning || "";
        let combined = false;
        // No phrase meaning yet: join the meanings of its words, marked as such.
        if (!meaning && !pending) {
          const parts = span.text
            .split(/\s+/)
            .map((t) =>
              shortMeaning(
                lookedUpMeaningsRef.current.get(normalizeToken(t)) ||
                  vocabularyIndexRef.current.get(normalizeToken(t))?.meaning ||
                  "",
                14,
              ),
            )
            .filter(Boolean);
          if (parts.length) {
            meaning = parts.join(" + ");
            combined = true;
          }
        }
        setLookedUpPhrases((map) => ({
          ...map,
          [sentence.id]: (map[sentence.id] || []).map((x) =>
            x.from === span.from && x.to === span.to ? { ...x, meaning, pending } : x,
          ),
        }));
        const word: LookedUpWord = {
          word: span.text,
          rect,
          sentence,
          inArticle: false,
          isPhrase: true,
          pending,
          meaning,
          ipa: entry?.ipa || "",
          partOfSpeech: entry?.phraseType || entry?.partOfSpeech || "cụm từ",
          officialWordId: entry?.officialWordId ?? null,
          source: combined
            ? "Ghép nghĩa từng từ — chưa có nghĩa riêng của cụm"
            : entry?.found
              ? DICTIONARY_LABEL
              : "",
        };
        setPopover((current) =>
          current && (current.word === span.text || current.sentence?.id === sentence.id)
            ? word
            : current,
        );
        if (!pending && meaning) addLookedUp(word);
      };
      apply(null, true);
      // A fast result with a meaning is enough; AI only when the fast pass has none.
      lookupWord(span.text, { context: sentence.text, ai: false, signedIn })
        .catch(() => null)
        .then((entry) => {
          if (entry?.meaning || entry?.aiAllowed === false || !signedIn) {
            apply(entry, false);
            return;
          }
          lookupWord(span.text, { context: sentence.text, ai: true, signedIn })
            .then((deep) => apply(deep?.found ? deep : entry, false))
            .catch(() => apply(entry, false));
        });
    },
    [signedIn, addLookedUp],
  );

  const openWord = useCallback(
    (token: MatchedToken, sentence: NewsSentenceDto, element: HTMLElement) => {
      const word = token.entry ? token.entry.word : token.text.replace(/[’']s$/, "");
      const base: LookedUpWord = {
        word,
        rect: element.getBoundingClientRect(),
        sentence,
        inArticle: !!token.entry,
      };
      setSelectedSentence(sentence.id);
      // Speak the word (or the whole phrase); reading aloud pauses and resumes when the card closes.
      const speak = (text: string) => {
        if (viewRef.current.speakOnClick) {
          if (readAloud.speakWord(text)) resumeAfterPopoverRef.current = true;
        } else if (readAloud.isReading) {
          readAloud.stop();
          resumeAfterPopoverRef.current = true;
        }
      };
      // Remember the position; touching another looked-up word → look up the whole phrase.
      const i = Number(element.dataset.word);
      const nextPositions = new Set(
        lookedUpPositionsRef.current.get(sentence.id) || new Set<number>(),
      ).add(i);
      setLookedUpPositions((map) => new Map(map).set(sentence.id, nextPositions));
      const span = findPhraseSpan(indexSentence(sentence.text), sentence.text, nextPositions, i);
      speak(span ? span.text : token.text);
      if (span) {
        if (token.entry) {
          addLookedUp({
            ...base,
            ipa: token.entry.ipa,
            partOfSpeech: token.entry.partOfSpeech,
            meaning: token.entry.meaning,
            source: PREPARED_LABEL,
          });
        }
        setLookedUpPhrases((map) => ({
          ...map,
          [sentence.id]: [
            ...(map[sentence.id] || []).filter((x) => x.to < span.from || x.from > span.to),
            { ...span, meaning: "", pending: true },
          ],
        }));
        setPopover({ ...base, word: span.text, isPhrase: true, pending: true });
        lookupPhrase(sentence, span, base.rect!);
        return;
      }
      if (token.entry) {
        const prepared: LookedUpWord = {
          ...base,
          ipa: token.entry.ipa,
          partOfSpeech: token.entry.partOfSpeech,
          meaning: token.entry.meaning,
          source: PREPARED_LABEL,
        };
        setPopover(prepared);
        addLookedUp(prepared);
        return;
      }
      // Same path as the dictionary: fast tiers first, AI only when incomplete (signed in).
      const apply = (entry: LookupEntry | null, pending: boolean) => {
        const result: LookedUpWord = {
          ...base,
          pending,
          ipa: entry?.ipa || "",
          partOfSpeech: entry?.partOfSpeech || "",
          meaning: entry?.meaning || "",
          officialWordId: entry?.officialWordId ?? null,
          source: entry?.found ? DICTIONARY_LABEL : "",
        };
        setPopover((current) => (current && current.word === word ? result : current));
        if (!pending) addLookedUp(result);
      };
      setPopover({ ...base, pending: true });
      lookupWord(word, { context: sentence.text, ai: false, signedIn })
        .then((entry) => {
          if (entry?.complete || !entry?.aiAllowed) {
            apply(entry, false);
            return null;
          }
          apply(entry, true);
          return lookupWord(word, { context: sentence.text, ai: true, signedIn }).then((deep) =>
            apply(deep?.found ? deep : entry, false),
          );
        })
        .catch(() => apply(null, false));
    },
    [readAloud, lookupPhrase, signedIn, addLookedUp],
  );

  const closePopover = useCallback(() => {
    setPopover(null);
    if (resumeAfterPopoverRef.current) {
      resumeAfterPopoverRef.current = false;
      readAloud.resume();
    }
  }, [readAloud]);

  // Keep the sentence being read in view (scroll only when it leaves the frame; Hack não keeps it centred).
  useEffect(() => {
    if (!(readAloud.isReading || brainHackOn) || !view.autoScroll) return;
    const el = articleRef.current?.querySelector(
      `[data-sentence="${sentences[readAloud.position.sentence]?.id}"]`,
    );
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frame =
      bodyRef.current && bodyRef.current.scrollHeight > bodyRef.current.clientHeight + 2
        ? bodyRef.current.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight };
    if (brainHackOn || rect.top < frame.top + 70 || rect.bottom > frame.bottom - 60)
      el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [readAloud.isReading, readAloud.position.sentence, sentences, view.autoScroll, brainHackOn]);

  /* ---------- notebook (PBL-75 library) ---------- */
  const saveToNotebook = useCallback(
    async (word: LookedUpWord) => {
      if (!signedIn) {
        notify("Đăng nhập để lưu từ vào sổ tay");
        return;
      }
      try {
        let officialWordId = word.officialWordId;
        if (officialWordId === undefined) {
          const entry = await lookupWord(word.word, { ai: false, signedIn: true }).catch(
            () => null,
          );
          officialWordId = entry?.officialWordId ?? null;
        }
        if (officialWordId) await saveWordMutation.mutateAsync({ wordId: officialWordId });
        else {
          await createCustomWord.mutateAsync({
            headword: word.word,
            phonetic: word.ipa || "",
            partOfSpeech: toPartOfSpeech(word.partOfSpeech, word.isPhrase),
            meaningVi: word.meaning || "",
            definitionEn: "",
            example: word.sentence?.text || "",
            exampleVi: word.sentence?.translation || "",
          });
        }
        setSavedWords((set) => new Set(set).add(word.word));
        notify(`Đã lưu “${word.word}” vào sổ tay`);
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 409) {
          setSavedWords((set) => new Set(set).add(word.word));
          notify(`Đã lưu “${word.word}” vào sổ tay`);
        } else
          notify(
            status === 401 || status === 403
              ? "Đăng nhập để lưu từ vào sổ tay"
              : "Chưa lưu được, thử lại nhé",
          );
      }
    },
    [signedIn, notify, saveWordMutation, createCustomWord],
  );

  const toggleKnown = useCallback(
    (word: string) =>
      setKnownWords((set) => {
        const next = new Set(set);
        if (next.has(word)) next.delete(word);
        else next.add(word);
        return next;
      }),
    [],
  );

  const firstSentenceWith = (word: string) =>
    sentences.find((s) =>
      attachVocabulary(splitWords(s.text), article.vocabulary, vocabularyIndex).some(
        (x) => x.entry?.word === word,
      ),
    );

  const goToWord = (word: string) => {
    const el = articleRef.current?.querySelector(`[data-entry="${CSS.escape(word)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Flash it (remove and re-add so a second click flashes again).
    el.classList.remove(sentenceStyles.flash);
    void (el as HTMLElement).offsetWidth;
    el.classList.add(sentenceStyles.flash);
    window.setTimeout(() => el.classList.remove(sentenceStyles.flash), 2200);
    setSheetOpen(false);
  };

  const vocabularyWord = (item: NewsVocabularyItemDto): LookedUpWord => ({
    word: item.word,
    ipa: item.ipa,
    partOfSpeech: item.partOfSpeech,
    meaning: item.meaning,
    sentence: firstSentenceWith(item.word),
  });

  /* ---------- Hack não ---------- */
  const memorizing = useMemo(
    () =>
      new Set([
        ...article.vocabulary.filter((x) => !knownWords.has(x.word)).map((x) => x.word),
        ...[...savedWords].map((w) => normalizeToken(w)),
      ]),
    [article, knownWords, savedWords],
  );
  const brainHackSummary = useMemo<MemorizedWord[]>(
    () =>
      article.vocabulary
        .filter((x) => !knownWords.has(x.word))
        .map((x) => ({
          word: x.word,
          ipa: x.ipa,
          partOfSpeech: x.partOfSpeech,
          meaning: x.meaning,
          sentence: sentences.find((s) =>
            attachVocabulary(splitWords(s.text), article.vocabulary, vocabularyIndex).some(
              (t) => t.entry?.word === x.word,
            ),
          ),
        })),
    [article, knownWords, sentences, vocabularyIndex],
  );

  /** Starts / switches Hack não: dictation begins at the first sentence not passed, listening where the reader is. */
  const startBrainHack = (next: BrainHackModeKey) => {
    setBrainHackMode(next);
    setBrainHackOn(true);
    setPopover(null);
    if (readAloud.rate === 1) readAloud.changeRate(0.9);
    readAloud.setSingleSentence(next === "dictation");
    const firstOpen = sentences.findIndex((s) => !dictation[s.id]?.passed);
    readAloud.playFromSentence(
      next === "dictation"
        ? Math.max(0, firstOpen)
        : readAloud.atEnd
          ? 0
          : readAloud.position.sentence,
    );
  };
  const exitBrainHack = () => {
    setBrainHackOn(false);
    readAloud.setSingleSentence(false);
    readAloud.stop();
  };

  // Dictation is graded on the server (the answer is there); then the next sentence plays.
  const checkDictation = async (sentence: NewsSentenceDto, input: string) => {
    const previous = dictation[sentence.id] || {};
    if (previous.passed) return;
    let result;
    try {
      result = await newsApi.checkDictation(slug, {
        sentenceId: sentence.id,
        text: input,
        revealed: !!previous.revealed,
      });
    } catch {
      notify("Chưa chấm được, kiểm tra mạng rồi thử lại nhé");
      return;
    }
    const record: DictationRecord = {
      ...previous,
      input,
      result,
      attempts: (previous.attempts || 0) + 1,
    };
    if (!result.correct) {
      setDictation((map) => ({ ...map, [sentence.id]: record }));
      return;
    }
    setDictation((map) => ({
      ...map,
      [sentence.id]: { ...record, passed: true, unaided: !previous.revealed },
    }));
    const nextIndex = sentences.findIndex(
      (s, i) => i > (sentenceIndex.get(sentence.id) ?? 0) && !dictation[s.id]?.passed,
    );
    if (nextIndex >= 0)
      window.setTimeout(() => {
        if (brainHackOnRef.current) readAloud.playFromSentence(nextIndex);
      }, 700);
  };
  const revealAnswer = (sentence: NewsSentenceDto) => {
    const record: DictationRecord = { ...dictation[sentence.id], revealed: true };
    setDictation((map) => ({ ...map, [sentence.id]: record }));
    sync.save(
      {
        dictation: {
          [sentence.id]: {
            passed: !!record.passed,
            unaided: !!record.unaided,
            revealed: true,
            attempts: record.attempts ?? 0,
            input: record.input ?? null,
          },
        },
      },
      true,
    );
  };
  const restartBrainHack = () => {
    if (brainHackMode === "dictation") {
      setDictation({});
      sync.save({ resetDictation: true }, true);
    }
    readAloud.playFromSentence(0);
  };

  /* ---------- completion ---------- */
  const handleComplete = async () => {
    setSummaryOpen(true);
    if (!signedIn || done || submitting) return;
    setSubmitting(true);
    try {
      const state = await newsApi.completeArticle(slug);
      setDone(state.done);
      writeStored(articleKey("done", slug), 1);
    } catch {
      notify("Chưa ghi nhận được, thử lại nhé");
    } finally {
      setSubmitting(false);
    }
  };

  const unknownVocabulary = article.vocabulary.filter((x) => !knownWords.has(x.word));
  const unsavedWords = [
    ...new Map<string, LookedUpWord>([
      ...unknownVocabulary.map((x) => [x.word, vocabularyWord(x)] as [string, LookedUpWord]),
      ...lookedUpWords.map((x) => [x.word, x] as [string, LookedUpWord]),
    ]).values(),
  ].filter((x) => !savedWords.has(x.word));
  const saveAll = async () => {
    for (const word of unsavedWords) {
      // One request at a time keeps the server light.
      await saveToNotebook(word);
    }
  };

  const panel = (
    <ReaderSidePanel
      seconds={seconds}
      idle={idle}
      wpm={wpm}
      percentRead={percentRead}
      vocabulary={article.vocabulary}
      occurrences={occurrences}
      knownWords={knownWords}
      savedWords={savedWords}
      lookedUpWords={lookedUpWords}
      notes={notes}
      onNotesChange={setNotes}
      onGoToWord={goToWord}
      onToggleKnown={toggleKnown}
      onSaveVocabulary={(item) => saveToNotebook(vocabularyWord(item))}
      onSaveLookedUp={saveToNotebook}
      tab={tab}
      onTabChange={setTab}
      filter={vocabularyFilter}
      onFilterChange={setVocabularyFilter}
    />
  );

  const columns = mode === "bilingual" && layout === "columns";
  const rootStyle = {
    "--karaoke": dark ? palette.karaokeDark : palette.karaoke,
    "--ink": dark ? palette.inkDark : palette.ink,
    "--accent": dark ? palette.accentDark : palette.accent,
    "--soft": dark ? palette.softDark : palette.soft,
    "--fs": `${fontSize}px`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.page} ${dark ? styles.dark : ""}`}
      data-reader-dark={dark}
      style={rootStyle}
    >
      <div className={styles.shell}>
        <ReaderTopBar
          readAloud={readAloud}
          sentenceCount={sentences.length}
          mode={mode}
          onModeChange={setMode}
          layout={layout}
          onLayoutChange={setLayout}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          palette={palette}
          onShufflePalette={() => setPalette((p) => pickPalette(p.key))}
          dark={dark}
          onToggleDark={() => setDark((v) => !v)}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
          seconds={seconds}
          idle={idle}
          percentRead={percentRead}
          onBack={() => {
            readAloud.stop();
            navigate("/games/news");
          }}
        />

        <div
          className={styles.body}
          style={{ gridTemplateColumns: `minmax(0, 1fr) 12px ${panelWidth}px` }}
        >
          <main
            className={styles.reading}
            ref={bodyRef}
            onScroll={() => {
              measureProgress();
              if (popover) closePopover();
            }}
          >
            <article className={styles.document} ref={articleRef}>
              <header className={styles.head}>
                <div className={styles.cover}>
                  {article.coverUrl ? (
                    <img src={article.coverUrl} alt="" />
                  ) : (
                    <span className={styles.coverPlaceholder} aria-hidden="true">
                      <ImageIcon size={30} />
                    </span>
                  )}
                </div>
                <div>
                  <p className={styles.kicker}>
                    {article.sourceName} · {stageLabel(article.stage)}
                  </p>
                  <h1 className={styles.title}>{article.titleEn}</h1>
                  <p className={styles.subtitle}>{article.titleVi}</p>
                  <p className={styles.meta}>
                    <span>
                      <Clock size={13} /> {article.minutes} phút đọc
                    </span>
                    <span>{wordCount} từ</span>
                    <span>{article.vocabulary.length} từ vựng</span>
                    {readAloud.isSupported && (
                      <button
                        type="button"
                        onClick={readAloud.togglePlay}
                        className={styles.listen}
                      >
                        {readAloud.isReading ? (
                          <>
                            <Pause size={14} /> Dừng đọc
                          </>
                        ) : (
                          <>
                            <Volume2 size={14} /> Nghe cả bài
                          </>
                        )}
                      </button>
                    )}
                  </p>
                </div>
              </header>
              <ReaderViewBar
                view={view}
                onToggleView={toggleView}
                speechSupported={readAloud.isSupported}
                brainHackOn={brainHackOn}
                brainHackMode={brainHackMode}
                onStartBrainHack={startBrainHack}
                onExitBrainHack={exitBrainHack}
              />
              {brainHackOn ? (
                <BrainHackMode
                  mode={brainHackMode}
                  article={article}
                  sentenceIndex={sentenceIndex}
                  position={readAloud.position}
                  atEnd={readAloud.atEnd}
                  vocabularyIndex={vocabularyIndex}
                  memorizing={memorizing}
                  lookedUpMeanings={lookedUpMeanings}
                  savedWords={savedWords}
                  summaryWords={brainHackSummary}
                  dictation={dictation}
                  onWord={openWord}
                  onSpeak={(w) => readAloud.speakWord(w)}
                  onSave={(w) => saveToNotebook(w)}
                  onSaveAll={async () => {
                    for (const w of brainHackSummary.filter((x) => !savedWords.has(x.word)))
                      await saveToNotebook(w);
                  }}
                  onRestart={restartBrainHack}
                  onExit={exitBrainHack}
                  onCheck={checkDictation}
                  onReplaySentence={readAloud.replaySentence}
                  onReveal={revealAnswer}
                />
              ) : (
                <div
                  ref={columnsRef}
                  className={columns ? styles.pairs : undefined}
                  style={columns ? ({ "--split": `${split}%` } as CSSProperties) : undefined}
                >
                  {columns && (
                    <div
                      className={styles.divider}
                      role="separator"
                      aria-orientation="vertical"
                      aria-valuenow={split}
                      aria-valuemin={30}
                      aria-valuemax={70}
                      aria-label="Kéo để chia hai cột tiếng Anh / tiếng Việt"
                      tabIndex={0}
                      onPointerDown={onSplitDrag}
                      onKeyDown={onSplitKey}
                      onDoubleClick={() => {
                        setSplit(DEFAULT_SPLIT);
                        writeSetting(STORAGE_KEYS.split, DEFAULT_SPLIT);
                      }}
                    >
                      <span />
                    </div>
                  )}
                  {article.paragraphs.map((paragraph, index) => (
                    <div key={paragraph.id} className={columns ? styles.pair : undefined}>
                      <p className={styles.paragraph} lang="en">
                        <button
                          type="button"
                          className={styles.paragraphNumber}
                          onClick={() =>
                            readAloud.playFromSentence(
                              sentenceIndex.get(paragraph.sentences[0].id) ?? 0,
                            )
                          }
                          aria-label={`Đọc từ đoạn ${index + 1}`}
                          title="Đọc từ đoạn này"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </button>
                        {paragraph.sentences.map((sentence) => (
                          <ReaderSentence
                            key={sentence.id}
                            sentence={sentence}
                            vocabulary={article.vocabulary}
                            vocabularyIndex={vocabularyIndex}
                            knownWords={knownWords}
                            mode={layout === "columns" ? "english" : mode}
                            active={selectedSentence === sentence.id}
                            reading={
                              readAloud.isReading &&
                              readAloud.position.sentence === sentenceIndex.get(sentence.id)
                            }
                            view={view}
                            lookedUpMeanings={lookedUpMeanings}
                            phrases={lookedUpPhrases[sentence.id]}
                            onWord={openWord}
                          />
                        ))}
                      </p>
                      {columns && (
                        <p className={styles.paragraphTranslation} lang="vi">
                          {paragraph.sentences.map((sentence) => (
                            <span
                              key={sentence.id}
                              className={
                                readAloud.position.sentence === sentenceIndex.get(sentence.id) &&
                                (readAloud.isReading || readAloud.position.word >= 0)
                                  ? styles.translationReading
                                  : undefined
                              }
                            >
                              {sentence.translation}{" "}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {(article.attribution || article.coverCredit) && (
                <footer className={styles.credit}>
                  {article.sourceUrl && (
                    <p>
                      Bài gốc:{" "}
                      <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {article.sourceName}
                        {article.author && article.author !== article.sourceName
                          ? ` · ${article.author}`
                          : ""}
                      </a>{" "}
                      — phạm vi công cộng. Bản dịch tiếng Việt: TOEIC Space.
                    </p>
                  )}
                  {article.coverCredit && (
                    <p>
                      {article.coverSourceUrl ? (
                        <a href={article.coverSourceUrl} target="_blank" rel="noopener noreferrer">
                          {article.coverCredit}
                        </a>
                      ) : (
                        article.coverCredit
                      )}
                    </p>
                  )}
                </footer>
              )}
              <div className={styles.done}>
                <p>Đọc xong rồi? Xem lại thời gian, tốc độ và lưu các từ mới vào sổ tay.</p>
                <button type="button" onClick={handleComplete} disabled={submitting}>
                  <CheckCircle2 size={17} /> Hoàn thành bài đọc
                </button>
                {done && <small className={styles.doneNote}>Đã hoàn thành</small>}
              </div>
            </article>
          </main>

          <div
            className={styles.splitter}
            role="separator"
            aria-orientation="vertical"
            aria-label="Kéo để đổi bề rộng cột từ vựng"
            tabIndex={0}
            onPointerDown={onPanelDrag}
            onKeyDown={onPanelKey}
            onDoubleClick={() => {
              setPanelWidth(DEFAULT_PANEL_WIDTH);
              writeSetting(STORAGE_KEYS.panelWidth, DEFAULT_PANEL_WIDTH);
            }}
          >
            <span />
          </div>
          <div className={styles.sideWrap}>{panel}</div>
        </div>
      </div>

      <DictionaryLookup
        open={dictionaryOpen}
        onOpenChange={setDictionaryOpen}
        signedIn={signedIn}
        savedWords={savedWords}
        onSave={saveToNotebook}
        onSpeak={(text) => readAloud.speakWord(text)}
      />

      <button type="button" className={styles.sheetButton} onClick={() => setSheetOpen(true)}>
        Từ vựng <b>{article.vocabulary.length}</b> · <Clock size={13} /> {formatDuration(seconds)}
      </button>
      {sheetOpen && (
        <div className={styles.sheet} onClick={() => setSheetOpen(false)}>
          <div className={styles.sheetCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.sheetClose}
              onClick={() => setSheetOpen(false)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            {panel}
          </div>
        </div>
      )}

      {popover && (
        <WordCard
          word={popover}
          saved={savedWords.has(popover.word)}
          known={knownWords.has(popover.word)}
          onClose={closePopover}
          onSave={saveToNotebook}
          onToggleKnown={toggleKnown}
          onSpeak={(w) => readAloud.speakWord(w)}
        />
      )}

      {summaryOpen && (
        <ReadingSummary
          title={article.titleVi}
          seconds={seconds}
          wpm={wpm}
          lookedUpCount={lookedUpWords.length}
          knownCount={knownWords.size}
          vocabularyCount={article.vocabulary.length}
          done={done}
          unsavedWords={unsavedWords.map((x) => x.word)}
          onSaveAll={saveAll}
          onClose={() => setSummaryOpen(false)}
        />
      )}

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
