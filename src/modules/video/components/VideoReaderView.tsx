// Full-screen bilingual reader (port of Studychill VideoReaderView; spec content/docs/frontend/ui/video-reader.md).
//
//   Desktop (> 1000px) — two columns: left sticks = video + transport + "Câu đang nói" + word tray,
//                        right = modebar + full-height transcript. Keyboard shortcuts.
//   Phone portrait     — video on top, transcript in the middle, transport at the BOTTOM (thumb reach); the word
//                        card and the settings are bottom sheets closed by swiping down.
//   Phone landscape    — video + transport left, transcript right.
//
// Worth knowing:
//  1. Karaoke only CHANGES TEXT COLOUR (not yet → said → speaking). Times come from the smooth clock read every
//     animation frame; state changes only when the sentence / word changes.
//  2. Auto-scroll scrolls ONLY the transcript box (list.scrollTo, never scrollIntoView, which would also scroll the
//     page and push the video away on phones). The spoken sentence is anchored at ~1/3 of the box.
//  3. A scroll INTENT of the learner (wheel, touchmove, scroll keys, scrollbar drag) stops auto-follow and shows
//     "Về câu đang phát" — scroll events are not used because our own smooth scroll fires them too.
//  4. Meanings load on demand: sentences around the playing one ask the `free` level; only a CLICK asks `ai`.
//  5. The hover tooltip is ONE element positioned by coordinates; off on touch screens.
//  6. Subtitles are cleaned once on arrival (speaker marks '>>', stray leading punctuation).
//  7. Modes: "Từng câu" (continuous, optional pause per sentence), "Liền mạch" (paragraphs), "Điền từ" (1–3 blanks
//     per sentence, pauses at the end of each sentence), "Viết lại" (rewrite the whole sentence with the dictation
//     grading core). The Hiện/Ẩn nghĩa button shares the "Bản dịch câu" setting.
//  8. Tier highlighting (TOEIC/B2/C1+): the server returns `levels` with the subtitles.
//  9. Progress: local on every pause, server ≥ 15 s apart and when leaving (keepalive); "Xem tiếp" on reopen.
// 10. End (ended, ≥ 95 % watched or "Kết thúc"): summary + lesson words → save / review with PBL-75 Reel.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { lookupVocabulary, type WordsSessionState } from "@/modules/vocabulary";

import { videoApi } from "../api/video.api";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useReaderProgress } from "../hooks/useReaderProgress";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useReaderSubtitles } from "../hooks/useReaderSubtitles";
import { useSmoothClock } from "../hooks/useSmoothClock";
import { useSplitWidth } from "../hooks/useSplitWidth";
import { useVideoSavedWords, type VideoWordToSave } from "../hooks/useVideoSavedWords";
import { useYtPlayer } from "../hooks/useYtPlayer";
import type {
  Cue,
  GlossEntryDto,
  GlossLevel,
  VideoResolveDto,
  WordInfoDto,
} from "../types/video.types";
import {
  buildRewriteSentence,
  isTurnDone,
  newTurn,
  type RewriteTurn,
} from "../utils/rewrite-exercise";
import {
  FONT_SIZES,
  READER_THEMES,
  WORD_TIERS,
  alignTranslation,
  cleanToken,
  findLastStartedCue,
  findTokenPhrase,
  formatTime,
  isDarkTheme,
  karaokeWordProgress,
  markSoundTokens,
  splitParagraphs,
  wordTier,
  type ListenMode,
  type WordTierKey,
} from "../utils/subtitle-reading";
import { isCorrectWord, pickHiddenTokens, splitToken } from "../utils/video-cloze";
import { pickSourceLanguage } from "../utils/video-lang";
import {
  lessonWords,
  toReelCards,
  type LessonWordItem,
  type PinnedWord,
} from "../utils/video-lesson";
import { videoLoginUrl } from "../utils/video-paths";
import { playWordAudio } from "../utils/word-audio";
import { BilingualSubtitles } from "./BilingualSubtitles";
import { ReaderCurrentSentence } from "./ReaderCurrentSentence";
import { ReaderHeader } from "./ReaderHeader";
import { ReaderModeBar } from "./ReaderModeBar";
import { ReaderNotice, ReaderResumePrompt } from "./ReaderNotice";
import {
  ReaderSettingsDrawer,
  ReaderTooltip,
  ReaderWordSheet,
  type ReaderTip,
} from "./ReaderOverlays";
import { ReaderParagraph } from "./ReaderParagraph";
import { ReaderPlayerFrame } from "./ReaderPlayerFrame";
import { ReaderTransport } from "./ReaderTransport";
import { ReaderRow } from "./ReaderRow";
import { ReaderFlow, ReaderRows, ReaderTranscript } from "./ReaderTranscript";
import { ReaderWordTray, type NearbyWord } from "./ReaderWordTray";
import type { ClozeState, CueLookups, PhraseLookup, WordDisplayProps } from "./ReaderWords";
import { ReadingSettingsBody } from "./ReadingSettingsBody";
import { ReadingSettingsSheet } from "./ReadingSettingsSheet";
import { VideoLessonSummary } from "./VideoLessonSummary";
import { WordFlashcard } from "./WordFlashcard";
import transcriptStyles from "./ReaderTranscript.module.css";
import styles from "./VideoReaderView.module.css";

const IFRAME_ID = "ts-video-player";

/* YouTube IFrame API error codes — the right reason tells the learner what to do. */
const ERROR_REASONS: Record<number | "general", string> = {
  2: "Link video không hợp lệ nên không mở được.",
  5: "Trình phát YouTube gặp lỗi. Thử tải lại trang.",
  100: "Video này đã bị gỡ hoặc để riêng tư.",
  101: "Chủ kênh không cho nhúng video này ra ngoài YouTube.",
  150: "Chủ kênh không cho nhúng video này ra ngoài YouTube.",
  general:
    "Không mở được trình phát YouTube. Hay gặp nhất là tài khoản Google " +
    "đang đăng nhập bị chặn YouTube (tài khoản trường hoặc công ty); ngoài ra " +
    "có thể do trình chặn quảng cáo hoặc mạng chặn youtube.com. Thử đăng xuất " +
    "Google rồi mở lại, hoặc dùng cửa sổ ẩn danh. Transcript bên dưới vẫn đọc được.",
};
const HOVER_DELAY = 160; // ms — sweeping the mouse over a line must not look up every word
const ANCHOR_MOBILE = 0.28;
const ANCHOR_DESKTOP = 0.33;
const PARAGRAPH_LENGTH = 220; // characters per paragraph in flow mode: short paragraphs keep the translation close
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);
const DONE_THRESHOLD = 0.95; // watched up to 95 % = end of the lesson, open the summary
const LEAD_TIME = 0.05; // s — highlight a bit early so the eye sees the word when the ear hears it
const MIN_VIDEO_WIDTH = 360;
const MIN_TRANSCRIPT_WIDTH = 440;
const SLOW_RATE = 0.75; // "Nghe chậm" of the rewrite mode
const GLOSS_BATCH = 50;
const SUMMARY_MEANINGS = 40;
const REVIEW_PATH = "/vocabulary/learn/reel?words=1";

const isTyping = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

/** Word clicked in a sentence: the card shows it with that sentence as context. */
interface SelectedWord {
  word: string;
  key: string;
  context: string;
  at: number;
  /** Index of the sentence, -1 when unknown. */
  i: number;
}

interface SummaryState {
  seconds: number;
  sentenceCount: number;
  items: LessonWordItem[];
}

export interface VideoReaderViewProps {
  video: VideoResolveDto;
  onClose: () => void;
  /** Deep-link start (s). */
  startAt?: number;
  /** "Xem tiếp" position (s), 0 = do not ask. */
  resumeAt?: number;
  /** Signed in: server progress, server checks, library. */
  saveToServer?: boolean;
}

export function VideoReaderView({
  video,
  onClose,
  startAt = 0,
  resumeAt = 0,
  saveToServer = true,
}: VideoReaderViewProps) {
  const navigate = useNavigate();
  const isGuest = !saveToServer;
  const isMobile = useMediaQuery("(max-width: 1000px)");
  const isTouch = useMediaQuery("(pointer: coarse)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const { settings, setSettings, changeSetting, mode, setMode } = useReaderSettings(saveToServer);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gloss, setGloss] = useState<Record<string, GlossEntryDto>>({});
  // Clicked tokens per sentence (bold + meaning above + merged phrases); the ref is read at once by onWordClick.
  const [lookups, setLookups] = useState<CueLookups>({});
  const lookupsRef = useRef(lookups);
  const [fetchingGloss, setFetchingGloss] = useState(false);
  const [tip, setTip] = useState<ReaderTip | null>(null);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const { savedWords, saveWords, saveNote, removeWord, saving } = useVideoSavedWords(!isGuest);
  const [wordDetails, setWordDetails] = useState<Record<string, WordInfoDto>>({});
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [reviewPicks, setReviewPicks] = useState<Set<string>>(() => new Set());
  // "Từng câu", "Điền từ" and "Viết lại" are laid out by sentence. Cloze / rewrite always pause at the end of a
  // sentence (typing time); "Từng câu" plays on unless "Dừng sau mỗi câu" is on.
  const bySentence = mode !== "flow";
  const isCloze = mode === "cloze";
  const isRewrite = mode === "rewrite";
  const pauseAtSentenceEnd =
    isCloze || isRewrite || (mode === "sentence" && !!settings.pauseEachSentence);
  const [cloze, setCloze] = useState<Record<number, ClozeState>>({});
  const clozeRef = useRef(cloze);
  const [rewrite, setRewrite] = useState<Record<number, RewriteTurn>>({});
  const rewriteRef = useRef(rewrite);
  const slowRef = useRef(false); // "Nghe chậm": back to 1× when it pauses at the sentence end
  const mediaRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const split = useSplitWidth(mediaRef, MIN_VIDEO_WIDTH, MIN_TRANSCRIPT_WIDTH);
  const [askResume, setAskResume] = useState(resumeAt > 0);
  const pausedCueRef = useRef<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const trackLanguages = useMemo(() => {
    const m = new Map<string, string>();
    [...(video.manual || []), ...(video.auto || [])].forEach((x) => {
      if (!m.has(x.code)) m.set(x.code, x.name || x.code);
    });
    return [...m.entries()];
  }, [video]);

  // Never fall back to "the first code": alphabetical order gives 'aa' (Afar) — see video-lang.ts.
  const [primaryLang] = useState(() => pickSourceLanguage(video));
  const availableLangs = useMemo(
    () => new Set(trackLanguages.map(([code]) => code)),
    [trackLanguages],
  );
  const secondaryLang = availableLangs.has(settings.glossLanguage)
    ? settings.glossLanguage
    : (primaryLang || "").indexOf("vi") === 0
      ? "en"
      : "vi";

  const { player, time, syncUnavailable, isPlaying, errorCode, ended } = useYtPlayer(
    IFRAME_ID,
    video.videoId,
    100,
  );
  const clock = useSmoothClock(player);
  const subs = useReaderSubtitles(video.videoId, primaryLang, secondaryLang);
  const { cues, levels: wordLevels, error, canRetry, preparing: preparingSubs } = subs;

  const requestedWordsRef = useRef(new Set<string>()); // words already sent, never sent twice
  const rowsRef = useRef(new Map<number, HTMLElement>());
  const listRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeAfterCardRef = useRef(false); // closing the card resumes playback if it was playing
  const clickedWordsRef = useRef(new Map<string, PinnedWord>()); // words opened on the card (for the summary)
  const savedThisSessionRef = useRef(new Map<string, PinnedWord>()); // words saved from this video now
  const reviewingRef = useRef(false);

  useEffect(() => {
    lookupsRef.current = lookups;
  }, [lookups]);
  useEffect(() => {
    clozeRef.current = cloze;
  }, [cloze]);
  useEffect(() => {
    rewriteRef.current = rewrite;
  }, [rewrite]);

  // MUST be memoised: `cues[lang] || []` builds a new array on every render, and karaoke renders often.
  const primaryCues = useMemo(() => cues[primaryLang] || [], [cues, primaryLang]);
  const secondaryCues = useMemo(() => cues[secondaryLang] || [], [cues, secondaryLang]);
  const translations = useMemo(
    () => alignTranslation(primaryCues, secondaryCues),
    [primaryCues, secondaryCues],
  );
  const paragraphs = useMemo(
    () => splitParagraphs(primaryCues, { maxChars: PARAGRAPH_LENGTH }),
    [primaryCues],
  );

  const hiddenByCue = useMemo(
    () => (isCloze ? primaryCues.map((c) => pickHiddenTokens(c[2], wordLevels)) : null),
    [isCloze, primaryCues, wordLevels],
  );
  const hiddenByCueRef = useRef(hiddenByCue);
  useEffect(() => {
    hiddenByCueRef.current = hiddenByCue;
  }, [hiddenByCue]);
  const clozeScore = useMemo(() => {
    let correct = 0;
    let total = 0;
    Object.values(cloze).forEach((r) =>
      Object.values(r.results || {}).forEach((k) => {
        if (k === "ok") {
          correct += 1;
          total += 1;
        } else if (k === "shown") total += 1;
      }),
    );
    return { correct, total };
  }, [cloze]);

  const rewriteTargets = useMemo(
    () => (isRewrite ? primaryCues.map((c) => buildRewriteSentence(c[2])) : null),
    [isRewrite, primaryCues],
  );
  const rewriteTargetsRef = useRef(rewriteTargets);
  useEffect(() => {
    rewriteTargetsRef.current = rewriteTargets;
  }, [rewriteTargets]);
  const rewriteScore = useMemo(() => {
    const doneTurns = Object.values(rewrite).filter(isTurnDone);
    return {
      correct: doneTurns.filter((t) => t.status !== "revealed").length,
      clean: doneTurns.filter((t) => t.status === "clean").length,
      total: doneTurns.length,
    };
  }, [rewrite]);

  // Sentence + word being spoken from the smooth clock: read every frame while playing, but state changes only when
  // the sentence / word CHANGES. Paused → recomputed from `time` (seeking while paused still updates).
  const [beat, setBeat] = useState({ i: -1, k: -1 });
  const timeWhenPaused = isPlaying ? -1 : time;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = (clock.now() || timeWhenPaused) + (isPlaying ? LEAD_TIME : 0);
      const i = findLastStartedCue(primaryCues, t);
      const k = i >= 0 ? karaokeWordProgress(primaryCues[i], t).i : -1;
      setBeat((p) => (p.i === i && p.k === k ? p : { i, k }));
      if (isPlaying) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clock, isPlaying, primaryCues, timeWhenPaused]);
  const activeIndex = beat.i;
  const activeCue = activeIndex >= 0 ? primaryCues[activeIndex] : null;
  const karaokeIndex = beat.k;

  // ── Meanings for a group of words ────────────────────────────────────────
  const requestGloss = useCallback(
    (wordList: readonly string[], level: GlossLevel) => {
      const pending: string[] = [];
      wordList.forEach((w) => {
        const k = (w || "").toLowerCase();
        // 'ai' may ask again for a word that has structure but still no Vietnamese meaning
        const hasGloss = gloss[k] && (gloss[k].meaning || gloss[k].ipa);
        const alreadySent = requestedWordsRef.current.has(`${k}:${level}`);
        if (k && !hasGloss && !alreadySent) {
          pending.push(k);
          requestedWordsRef.current.add(`${k}:${level}`);
        }
      });
      if (!pending.length) return;
      setFetchingGloss(true);
      const promises = [];
      for (let i = 0; i < pending.length; i += GLOSS_BATCH) {
        promises.push(videoApi.gloss(pending.slice(i, i + GLOSS_BATCH), level));
      }
      Promise.all(promises)
        .then((results) => {
          const merged: Record<string, GlossEntryDto> = {};
          results.forEach((res) => {
            if (res && res.gloss) Object.assign(merged, res.gloss);
          });
          if (Object.keys(merged).length) setGloss((prev) => ({ ...prev, ...merged }));
        })
        .catch(() => {})
        .finally(() => setFetchingGloss(false));
    },
    [gloss],
  );
  const clickLevel: GlossLevel = isGuest ? "free" : "ai";

  // Meanings & phonetics for the sentences around the playing one.
  useEffect(() => {
    if (!primaryCues.length) return undefined;
    if (!settings.showGloss && !settings.showPhonetic) return undefined;
    const startIdx = Math.max(0, (activeIndex >= 0 ? activeIndex : 0) - 2);
    const endIdx = Math.min(primaryCues.length, startIdx + 20);
    const wordsToFetch: string[] = [];
    for (let idx = startIdx; idx < endIdx; idx += 1) {
      const cue = primaryCues[idx];
      if (!cue || !cue[2]) continue;
      const toks = cue[2].split(" ");
      const sfx = markSoundTokens(toks);
      toks.forEach((tok, j) => {
        if (sfx[j]) return;
        const w = cleanToken(tok);
        if (w) wordsToFetch.push(w);
      });
    }
    const id = setTimeout(() => requestGloss(wordsToFetch, "free"), 120);
    return () => clearTimeout(id);
  }, [primaryCues, activeIndex, settings.showGloss, settings.showPhonetic, requestGloss]);

  const savedWordSet = useMemo(() => new Set(Object.keys(savedWords)), [savedWords]);

  const fontScale = useMemo(() => {
    const f = FONT_SIZES.find((x) => x.key === settings.fontSize);
    return f ? f.scale : 1;
  }, [settings.fontSize]);

  /** Cloze: focus the first wrong blank (text selected to retype), else the first empty one. Rewrite: its input. */
  const focusBlank = useCallback((i: number, results: ClozeState["results"] | null = null) => {
    const list = listRef.current;
    if (rewriteTargetsRef.current) {
      const el = list && list.querySelector<HTMLElement>(`[data-rewrite="${i}"]`);
      if (el) el.focus({ preventScroll: true });
      return;
    }
    const hiddenIndices = hiddenByCueRef.current && hiddenByCueRef.current[i];
    if (!hiddenIndices || !hiddenIndices.length || !list) return;
    const statuses = results || (clozeRef.current[i] && clozeRef.current[i].results) || {};
    const j =
      hiddenIndices.find((x) => statuses[x] === "wrong") ?? hiddenIndices.find((x) => !statuses[x]);
    if (j === undefined) return;
    const el = list.querySelector<HTMLInputElement>(`[data-blank="${i}-${j}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      if (statuses[j] === "wrong") el.select();
    }
  }, []);

  // ── Pause at the real end of a sentence ──────────────────────────────────
  const getCueEndTime = useCallback(
    (i: number) => {
      if (i < 0 || i >= primaryCues.length) return 0;
      const cue = primaryCues[i];
      const start = cue[0];
      const nominalEnd = start + (cue[1] || 0);
      if (i + 1 < primaryCues.length) {
        const nextStart = primaryCues[i + 1][0];
        if (nextStart > start) return Math.min(nominalEnd, nextStart);
      }
      return nominalEnd;
    },
    [primaryCues],
  );

  useEffect(() => {
    if (!pauseAtSentenceEnd || !player || !primaryCues.length) return undefined;
    const id = setInterval(() => {
      try {
        if (player.getPlayerState() !== 1) return; // only while playing
        const currentTime = player.getCurrentTime();
        if (typeof currentTime !== "number" || Number.isNaN(currentTime)) return;
        const currentIndex = findLastStartedCue(primaryCues, currentTime);
        if (currentIndex < 0 || currentIndex >= primaryCues.length) return;
        // The learner jumped to another sentence (seek): forget the old pause mark.
        if (pausedCueRef.current !== null && pausedCueRef.current !== currentIndex) {
          pausedCueRef.current = null;
        }
        if (pausedCueRef.current === currentIndex) return; // already paused here
        // Rewrite: sentences with sounds only or already written play through.
        const target = rewriteTargetsRef.current && rewriteTargetsRef.current[currentIndex];
        if (
          rewriteTargetsRef.current &&
          (!target || !target.length || isTurnDone(rewriteRef.current[currentIndex])) &&
          !slowRef.current
        )
          return;
        const endTime = getCueEndTime(currentIndex);
        // −0.08 s compensates the postMessage delay of the YouTube iframe.
        if (endTime > 0 && currentTime >= endTime - 0.08) {
          pausedCueRef.current = currentIndex;
          player.pauseVideo();
          if (slowRef.current) {
            slowRef.current = false;
            try {
              player.setPlaybackRate(1);
            } catch {
              /* ignore */
            }
          }
          if ((isCloze || isRewrite) && !isTouch) setTimeout(() => focusBlank(currentIndex), 0);
        }
      } catch {
        /* player may be detached */
      }
    }, 50);
    return () => clearInterval(id);
  }, [
    pauseAtSentenceEnd,
    player,
    primaryCues,
    getCueEndTime,
    isCloze,
    isRewrite,
    isTouch,
    focusBlank,
  ]);

  // ── Cloze: typing / revealing ─────────────────────────────────────────────
  // The ref is written in the handler (not in an effect): Enter right after the last key reads the typed text.
  const commitCloze = useCallback((i: number, state: ClozeState) => {
    const next = { ...clozeRef.current, [i]: state };
    clozeRef.current = next;
    setCloze(next);
  }, []);

  const typeBlank = useCallback(
    (i: number, j: number, value: string) => {
      const r = clozeRef.current[i] || { values: {}, results: {} };
      const results = r.results[j] === "wrong" ? { ...r.results, [j]: "" as const } : r.results;
      commitCloze(i, { values: { ...r.values, [j]: value }, results });
    },
    [commitCloze],
  );

  const revealCue = useCallback(
    (i: number) => {
      const hiddenIndices = hiddenByCueRef.current && hiddenByCueRef.current[i];
      if (!hiddenIndices || !primaryCues[i]) return;
      const tokens = primaryCues[i][2].split(" ");
      const r = clozeRef.current[i] || { values: {}, results: {} };
      const results = { ...r.results };
      const values = { ...r.values };
      const burned: Record<string, string> = {};
      hiddenIndices.forEach((j) => {
        if (results[j] === "ok") return;
        // Revealed before ever submitting: tell the server (empty text), like Studychill.
        if (!results[j]) burned[j] = "";
        results[j] = "shown";
        values[j] = splitToken(tokens[j])[1];
      });
      commitCloze(i, { values, results });
      if (!isGuest && Object.keys(burned).length) {
        videoApi.checkCloze(video.videoId, primaryLang, i, burned).catch(() => {});
      }
    },
    [primaryCues, commitCloze, isGuest, video.videoId, primaryLang],
  );

  // ── Rewrite: one typing turn per sentence ─────────────────────────────────
  const commitRewrite = useCallback(
    (i: number, turn: RewriteTurn) => {
      const prev = rewriteRef.current[i];
      const next = { ...rewriteRef.current, [i]: turn };
      rewriteRef.current = next;
      setRewrite(next);
      // A sentence just written correctly (not revealed): the server checks it against the subtitles.
      if (!isGuest && turn && turn.phase === "correct" && (!prev || prev.phase !== "correct")) {
        videoApi.checkRewrite(video.videoId, primaryLang, i, turn.words).catch(() => {});
      }
    },
    [isGuest, video.videoId, primaryLang],
  );

  const retryRewrite = useCallback(
    (i: number) => {
      const target = rewriteTargetsRef.current && rewriteTargetsRef.current[i];
      if (!target) return;
      commitRewrite(i, newTurn(target.length));
      setTimeout(() => focusBlank(i), 0);
    },
    [commitRewrite, focusBlank],
  );

  // ── Watch progress ────────────────────────────────────────────────────────
  useReaderProgress({ video, player, time, isPlaying, saveToServer });

  // ── Auto-scroll: ONLY the transcript box ─────────────────────────────────
  const correctionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToCue = useCallback(
    (i: number, smooth: boolean) => {
      const list = listRef.current;
      const el = rowsRef.current.get(i);
      if (!list || !el) return;
      const anchor = isMobile ? ANCHOR_MOBILE : ANCHOR_DESKTOP;
      // Not offsetTop: paragraphs use content-visibility, so a segment's offsetParent is not the scroll box.
      const getTargetTop = () =>
        Math.max(
          0,
          el.getBoundingClientRect().top -
            list.getBoundingClientRect().top +
            list.scrollTop -
            list.clientHeight * anchor,
        );
      const targetTop = getTargetTop();
      const distance = Math.abs(list.scrollTop - targetTop);
      if (distance < 4) return;
      // Long jumps (seek, mode change) go straight: smooth-scrolling thousands of px is slow and drifts.
      const reallySmooth = smooth && !reducedMotion && distance < list.clientHeight * 1.5;
      list.scrollTo({ top: targetTop, behavior: reallySmooth ? "smooth" : "auto" });
      // Rows never rendered (content-visibility) only have an estimated height; they get their real height while
      // scrolling, so the target moves. Re-check after scrolling, a few times at most.
      if (correctionTimerRef.current) clearTimeout(correctionTimerRef.current);
      let attempts = 0;
      const recheck = () => {
        const retargetTop = getTargetTop();
        if (Math.abs(list.scrollTop - retargetTop) > 12 && attempts < 3) {
          attempts += 1;
          list.scrollTo({ top: retargetTop, behavior: "auto" });
          correctionTimerRef.current = setTimeout(recheck, 60);
        }
      };
      correctionTimerRef.current = setTimeout(recheck, reallySmooth ? 500 : 60);
    },
    [isMobile, reducedMotion],
  );

  useEffect(
    () => () => {
      if (correctionTimerRef.current) clearTimeout(correctionTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (autoScroll && activeIndex >= 0) scrollToCue(activeIndex, true);
  }, [activeIndex, autoScroll, scrollToCue]);

  // Layout change (rotation, font size, annotations) → re-anchor at once, do not wait for the next sentence.
  const layoutKey = [
    isMobile,
    mode,
    settings.fontSize,
    settings.showTranslation,
    settings.showGloss,
    settings.showPhonetic,
  ].join("|");
  const anchorRef = useRef({ autoScroll, activeIndex, scrollToCue });
  useEffect(() => {
    anchorRef.current = { autoScroll, activeIndex, scrollToCue };
  });
  useEffect(() => {
    const { autoScroll: follow, activeIndex: i, scrollToCue: scroll } = anchorRef.current;
    if (follow && i >= 0) scroll(i, false);
  }, [layoutKey]);

  const onUserScroll = useCallback(() => {
    setAutoScroll((v) => (v ? false : v));
  }, []);
  const onListKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (SCROLL_KEYS.has(e.key)) onUserScroll();
    },
    [onUserScroll],
  );
  // A press on the box itself (not a row) = dragging the scrollbar.
  const onListPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.target === listRef.current) onUserScroll();
    },
    [onUserScroll],
  );

  // ── Playback controls ─────────────────────────────────────────────────────
  const didInitialSeekRef = useRef(false);
  useEffect(() => {
    if (!player || !startAt || didInitialSeekRef.current) return;
    didInitialSeekRef.current = true;
    try {
      player.seekTo(Math.max(0, startAt), true);
    } catch {
      /* ignore */
    }
  }, [player, startAt]);

  const seekAndPlay = useCallback(
    (seconds: number) => {
      if (!player) return;
      try {
        player.seekTo(Math.max(0, seconds), true);
        player.playVideo();
      } catch {
        /* ignore */
      }
    },
    [player],
  );

  // Clicking a row = going there → follow the playing sentence again.
  const onRowClick = useCallback(
    (seconds: number) => {
      setAutoScroll(true);
      pausedCueRef.current = null;
      seekAndPlay(seconds);
    },
    [seekAndPlay],
  );

  const togglePlay = useCallback(() => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        // Paused at a sentence end in a pausing mode: Play goes on with the next sentence.
        if (pauseAtSentenceEnd && pausedCueRef.current !== null && primaryCues.length) {
          const nextIdx = pausedCueRef.current + 1;
          pausedCueRef.current = null;
          if (nextIdx < primaryCues.length) {
            seekAndPlay(primaryCues[nextIdx][0]);
            return;
          }
        }
        player.playVideo();
      }
    } catch {
      /* ignore */
    }
  }, [player, isPlaying, pauseAtSentenceEnd, primaryCues, seekAndPlay]);

  // Enter: grade the typed blanks of the sentence. Enter again on a finished sentence = next sentence.
  const checkCue = useCallback(
    (i: number) => {
      const hiddenIndices = hiddenByCueRef.current && hiddenByCueRef.current[i];
      if (!hiddenIndices || !hiddenIndices.length || !primaryCues[i]) return;
      const r = clozeRef.current[i] || { values: {}, results: {} };
      if (hiddenIndices.every((j) => r.results[j] === "ok" || r.results[j] === "shown")) {
        if (i + 1 < primaryCues.length) {
          pausedCueRef.current = null;
          seekAndPlay(primaryCues[i + 1][0]);
        }
        return;
      }
      const tokens = primaryCues[i][2].split(" ");
      const typed: Record<string, string> = {};
      hiddenIndices.forEach((j) => {
        if (r.results[j] === "ok" || r.results[j] === "shown") return;
        const value = ((r.values && r.values[j]) || "").trim();
        if (value) typed[j] = value;
      });
      const apply = (isRight: (j: string) => boolean) => {
        const cur = clozeRef.current[i] || { values: {}, results: {} };
        const results = { ...cur.results };
        Object.keys(typed).forEach((j) => {
          const idx = Number(j);
          if (results[idx] === "ok" || results[idx] === "shown") return;
          if (((cur.values && cur.values[idx]) || "").trim() !== typed[j]) return; // retyped while waiting
          results[idx] = isRight(j) ? "ok" : "wrong";
        });
        commitCloze(i, { values: cur.values || {}, results });
        setTimeout(() => focusBlank(i, results), 0);
      };
      const localRight = (j: string) => isCorrectWord(typed[j], splitToken(tokens[Number(j)])[1]);
      if (isGuest || !Object.keys(typed).length) {
        apply(localRight);
        return;
      }
      // Signed in: graded by the server; on a network error graded locally.
      videoApi
        .checkCloze(video.videoId, primaryLang, i, typed)
        .then((d) => {
          const res = (d && d.results) || {};
          apply((j) => (String(j) in res ? !!res[String(j)] : localRight(j)));
        })
        .catch(() => apply(localRight));
    },
    [primaryCues, seekAndPlay, focusBlank, commitCloze, isGuest, video.videoId, primaryLang],
  );

  const resumeWatching = useCallback(() => {
    setAskResume(false);
    pausedCueRef.current = null;
    setAutoScroll(true);
    seekAndPlay(resumeAt);
  }, [seekAndPlay, resumeAt]);

  // Replay button at the end of a cloze sentence: replays that sentence; typed text lives in state, so it stays.
  const replayCue = useCallback(
    (i: number) => {
      const cue = primaryCues[i];
      if (!cue) return;
      pausedCueRef.current = null;
      setAutoScroll(true);
      seekAndPlay(cue[0]);
      if (!isTouch) setTimeout(() => focusBlank(i), 0);
    },
    [primaryCues, seekAndPlay, isTouch, focusBlank],
  );

  // Rewrite: listen again (slow lowers the rate, the sentence-end pause restores 1×).
  const listenRewrite = useCallback(
    (i: number, slow: boolean) => {
      const cue = primaryCues[i];
      if (!cue || !player) return;
      slowRef.current = !!slow;
      try {
        player.setPlaybackRate(slow ? SLOW_RATE : 1);
      } catch {
        /* ignore */
      }
      pausedCueRef.current = null;
      setAutoScroll(true);
      seekAndPlay(cue[0]);
      if (!isTouch) setTimeout(() => focusBlank(i), 0);
    },
    [primaryCues, player, seekAndPlay, isTouch, focusBlank],
  );

  const nextRewrite = useCallback(
    (i: number) => {
      if (i + 1 >= primaryCues.length) return;
      pausedCueRef.current = null;
      setAutoScroll(true);
      seekAndPlay(primaryCues[i + 1][0]);
    },
    [primaryCues, seekAndPlay],
  );

  const toggleTranslation = useCallback(() => {
    setSettings((prev) => ({ ...prev, showTranslation: !prev.showTranslation }));
  }, [setSettings]);

  // Play button of the card's context sentence: plays exactly that sentence, then pauses.
  const clipRef = useRef<{ start: number; end: number } | null>(null);
  const playClip = useCallback(
    (i: number) => {
      const cue = primaryCues[i];
      if (!cue) return;
      clipRef.current = { start: cue[0], end: getCueEndTime(i) };
      resumeAfterCardRef.current = false;
      pausedCueRef.current = null;
      seekAndPlay(cue[0]);
    },
    [primaryCues, getCueEndTime, seekAndPlay],
  );

  useEffect(() => {
    const clip = clipRef.current;
    if (!clip) return;
    if (time < clip.start - 0.6 || time > clip.end + 1.5) {
      clipRef.current = null; // seeked somewhere else
      return;
    }
    if (time >= clip.end - 0.08) {
      clipRef.current = null;
      try {
        player?.pauseVideo();
      } catch {
        /* ignore */
      }
    }
  }, [time, player]);

  const replayCurrent = useCallback(() => {
    if (activeCue) {
      pausedCueRef.current = null;
      seekAndPlay(activeCue[0]);
    }
  }, [activeCue, seekAndPlay]);

  const nextCue = useCallback(() => {
    const i = activeIndex < 0 ? 0 : activeIndex + 1;
    if (i < primaryCues.length) {
      pausedCueRef.current = null;
      seekAndPlay(primaryCues[i][0]);
    }
  }, [activeIndex, primaryCues, seekAndPlay]);

  const prevCue = useCallback(() => {
    if (activeIndex > 0) {
      pausedCueRef.current = null;
      seekAndPlay(primaryCues[activeIndex - 1][0]);
    }
  }, [activeIndex, primaryCues, seekAndPlay]);

  const changeMode = useCallback(
    (nextMode?: ListenMode) => {
      pausedCueRef.current = null;
      setAutoScroll(true);
      setMode((v) => nextMode || (v === "sentence" ? "flow" : "sentence"));
    },
    [setMode],
  );

  const toggleTier = useCallback(
    (tier: WordTierKey) => {
      setSettings((prev) => {
        const tiers = new Set((prev.highlightTiers || "").split(",").filter(Boolean));
        if (tiers.has(tier)) tiers.delete(tier);
        else tiers.add(tier);
        return {
          ...prev,
          highlightTiers: WORD_TIERS.map((b) => b.key)
            .filter((k) => tiers.has(k))
            .join(","),
        };
      });
    },
    [setSettings],
  );

  const backToCurrent = useCallback(() => {
    setAutoScroll(true);
    if (activeIndex >= 0) scrollToCue(activeIndex, true);
  }, [activeIndex, scrollToCue]);

  // Embedding disabled / age-restricted (101, 150) or removed (100): the server re-checks with YouTube itself and
  // hides the video from the catalog. It never trusts the client.
  const reportedRef = useRef(false);
  useEffect(() => {
    if (reportedRef.current || (errorCode !== 101 && errorCode !== 150 && errorCode !== 100))
      return;
    reportedRef.current = true;
    videoApi.reportUnplayable(video.videoId, errorCode).catch(() => {});
  }, [errorCode, video.videoId]);
  const embedBlocked = errorCode === 101 || errorCode === 150;

  // ── Word card ─────────────────────────────────────────────────────────────
  // Meaning of a phrase (2–5 adjacent clicked words): the quick lookup first (no AI); only when it has no meaning
  // the AI pass; still nothing → the word meanings joined.
  const glossRefCurrent = useRef(gloss);
  useEffect(() => {
    glossRefCurrent.current = gloss;
  }, [gloss]);

  const lookupPhrase = useCallback(
    async (cueIndex: number, phrase: PhraseLookup, context: string) => {
      const applyMeaning = (meaning: string) => {
        const entry = lookupsRef.current[cueIndex];
        if (!entry) return;
        const next = {
          ...lookupsRef.current,
          [cueIndex]: {
            ...entry,
            phrases: entry.phrases.map((c) =>
              c.from === phrase.from && c.to === phrase.to ? { ...c, meaning, loading: false } : c,
            ),
          },
        };
        lookupsRef.current = next;
        setLookups(next);
      };
      if (!isGuest) {
        const quick = await lookupVocabulary({ text: phrase.text, context, allowAi: false }).catch(
          () => null,
        );
        if (quick?.meaningVi) {
          applyMeaning(quick.meaningVi);
          return;
        }
        const deep = await lookupVocabulary({ text: phrase.text, context, allowAi: true }).catch(
          () => null,
        );
        if (deep?.meaningVi) {
          applyMeaning(deep.meaningVi);
          return;
        }
      }
      const toks = (primaryCues[cueIndex]?.[2] || "").split(" ").slice(phrase.from, phrase.to + 1);
      const glossNow = glossRefCurrent.current;
      const pieces = toks
        .map((x) => glossNow[cleanToken(x).toLowerCase()]?.meaning?.split(/[,;]/)[0]?.trim())
        .filter(Boolean);
      applyMeaning(pieces.length ? pieces.join(" + ") : "");
    },
    [isGuest, primaryCues],
  );

  const onWordClick = useCallback(
    (word: string, cue: Cue | null, tokenIndex?: number) => {
      resumeAfterCardRef.current = resumeAfterCardRef.current || !!isPlaying;
      try {
        player?.pauseVideo();
      } catch {
        /* ignore */
      }
      const key = word.toLowerCase();
      const sourceCue = cue || activeCue;
      const i = sourceCue ? primaryCues.indexOf(sourceCue) : -1;
      clickedWordsRef.current.set(key, { word, cue: sourceCue });
      setSelectedWord({
        word,
        key,
        context: sourceCue ? sourceCue[2] : "",
        at: sourceCue ? sourceCue[0] : 0,
        i,
      });
      setTip(null);
      requestGloss([key], clickLevel);
      // Clicked in a sentence: bold + meaning above; touching an already clicked word merges a phrase, read aloud.
      let speakText = word;
      if (sourceCue && i >= 0 && tokenIndex != null && tokenIndex >= 0) {
        const entry = lookupsRef.current[i] || { sel: [], phrases: [] };
        const sel = entry.sel.includes(tokenIndex) ? entry.sel : [...entry.sel, tokenIndex];
        const merged = findTokenPhrase(sourceCue[2].split(" "), new Set(sel), tokenIndex);
        let phrases = entry.phrases;
        let target: PhraseLookup | null = null;
        if (merged) {
          const existing = phrases.find((c) => c.from === merged.from && c.to === merged.to);
          target = existing || { ...merged, meaning: "", loading: true };
          phrases = [...phrases.filter((c) => c.to < merged.from || c.from > merged.to), target];
          speakText = merged.text;
        }
        const next = { ...lookupsRef.current, [i]: { sel, phrases } };
        lookupsRef.current = next;
        setLookups(next);
        if (target && !target.meaning) void lookupPhrase(i, target, sourceCue[2]);
      }
      playWordAudio(speakText);
    },
    [player, isPlaying, activeCue, primaryCues, requestGloss, clickLevel, lookupPhrase],
  );

  // Card details (synonyms, antonyms, other senses, family) — asked once per word, when the card opens.
  const requestedDetailsRef = useRef(new Set<string>());
  const selectedKey = selectedWord?.key ?? "";
  useEffect(() => {
    if (!selectedKey || requestedDetailsRef.current.has(selectedKey)) return;
    requestedDetailsRef.current.add(selectedKey);
    videoApi
      .getWordInfo(selectedKey)
      .then((d) => {
        if (d) setWordDetails((t) => ({ ...t, [selectedKey]: d }));
      })
      .catch(() => requestedDetailsRef.current.delete(selectedKey));
  }, [selectedKey]);

  const closeCard = useCallback(() => {
    setSelectedWord(null);
    if (resumeAfterCardRef.current) {
      resumeAfterCardRef.current = false;
      try {
        player?.playVideo();
      } catch {
        /* ignore */
      }
    }
  }, [player]);

  // Returns the promise and lets errors through: the folder form shows the right reason.
  const saveCurrentWord = useCallback(
    async (folderId: string | null, item: VideoWordToSave) => {
      if (!selectedWord) return;
      await saveWords([item], folderId);
      const cue = selectedWord.i >= 0 ? primaryCues[selectedWord.i] : null;
      savedThisSessionRef.current.set(selectedWord.key, { word: selectedWord.word, cue });
    },
    [selectedWord, saveWords, primaryCues],
  );

  const saveWordNote = useCallback(
    (savedWordId: string, note: string) => {
      saveNote(savedWordId, note).catch(() => {});
    },
    [saveNote],
  );

  const removeSavedWord = useCallback(
    (savedWordId: string) => {
      removeWord(savedWordId).catch(() => {});
    },
    [removeWord],
  );

  // ── Hover (mouse only): one tooltip, delegated on the list ────────────────
  const onHover = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!settings.hoverGloss) return;
      const target = e.target as HTMLElement;
      const el = target.closest ? target.closest<HTMLElement>("[data-word]") : null;
      if (!el) {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setTip((t) => (t ? null : t));
        return;
      }
      const w = el.dataset.word;
      if (!w) return;
      setTip((t) => {
        if (t && t.word === w) return t;
        const r = el.getBoundingClientRect();
        return { word: w, x: r.left + r.width / 2, y: r.top };
      });
      if (!gloss[w]) {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => requestGloss([w], "free"), HOVER_DELAY);
      }
    },
    [settings.hoverGloss, gloss, requestGloss],
  );

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  // ── End of the lesson ─────────────────────────────────────────────────────
  const studySecondsRef = useRef(0);
  const heardCuesRef = useRef(new Set<number>());
  const summaryOpenedRef = useRef(false);
  const [loadingLessonMeanings, setLoadingLessonMeanings] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) studySecondsRef.current += 1;
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && isPlaying) heardCuesRef.current.add(activeIndex);
  }, [activeIndex, isPlaying]);

  const openSummary = useCallback(() => {
    summaryOpenedRef.current = true;
    try {
      player?.pauseVideo();
    } catch {
      /* ignore */
    }
    // Pinned: words saved from this video now (the library has no video link) and words opened on the card.
    const pinned = new Map<string, PinnedWord>();
    savedThisSessionRef.current.forEach((v, k) => pinned.set(k, { ...v, saved: true }));
    clickedWordsRef.current.forEach((v, k) => {
      if (!pinned.has(k)) pinned.set(k, { ...v, saved: !!savedWords[k] });
    });
    const lastCueIndex = Math.max(activeIndex, ...heardCuesRef.current);
    const items = lessonWords({ cues: primaryCues, lastCueIndex, levels: wordLevels, pinned }).map(
      (it) => ({
        ...it,
        saved: it.saved || !!savedWords[it.k],
        meaning: (savedWords[it.k] && savedWords[it.k].meaningVi) || "",
      }),
    );
    setReviewPicks(new Set(items.filter((it) => it.preselected).map((it) => it.k)));
    setSummary({
      seconds: studySecondsRef.current,
      sentenceCount: heardCuesRef.current.size,
      items,
    });
    const missing = items
      .filter((it) => !it.meaning && !(gloss[it.k] && gloss[it.k].meaning))
      .map((it) => it.k)
      .slice(0, SUMMARY_MEANINGS);
    if (!missing.length) return;
    setLoadingLessonMeanings(true);
    const request = isGuest
      ? videoApi.getWordMeanings(missing)
      : videoApi
          .gloss(missing, "ai")
          .then((r) => (r && r.gloss) || {})
          .catch(() => videoApi.getWordMeanings(missing));
    request
      .then((m) => setGloss((t) => ({ ...t, ...m })))
      .catch(() => {})
      .finally(() => setLoadingLessonMeanings(false));
  }, [player, savedWords, primaryCues, activeIndex, wordLevels, gloss, isGuest]);

  // Opens by itself when the video ends or 95 % is watched — once; afterwards only with "Kết thúc".
  useEffect(() => {
    if (summaryOpenedRef.current || !primaryCues.length || !heardCuesRef.current.size)
      return undefined;
    let duration = video.duration || 0;
    try {
      if (!duration && player) duration = player.getDuration() || 0;
    } catch {
      /* player detached */
    }
    if (!ended && !(duration > 30 && time >= duration * DONE_THRESHOLD)) return undefined;
    const id = setTimeout(openSummary, 0);
    return () => clearTimeout(id);
  }, [ended, time, player, video.duration, primaryCues.length, openSummary]);

  const translationOf = useCallback(
    (it: LessonWordItem) => {
      const i = it.cue ? primaryCues.indexOf(it.cue) : -1;
      return i >= 0 ? translations[i] || "" : "";
    },
    [primaryCues, translations],
  );

  /** Summary items → words to save (example = the video sentence and its translation). */
  const toSaveItems = useCallback(
    (items: readonly LessonWordItem[]): VideoWordToSave[] =>
      items.map((it) => {
        const g = gloss[it.k];
        const example = it.cue ? it.cue[2] : "";
        const exampleVi = it.cue ? translationOf(it) : "";
        return {
          word: it.word || it.k,
          meaning: g?.meaning || it.meaning || "",
          phonetic: g?.ipa || "",
          partOfSpeech: g?.partOfSpeech || "",
          example,
          exampleVi:
            exampleVi.trim().toLowerCase() === example.trim().toLowerCase() ? "" : exampleVi,
        };
      }),
    [gloss, translationOf],
  );

  // "Ôn ngay": signed in → the selected words with a meaning go to the library, then the PBL-75 Reel studies them.
  const reviewNow = useCallback(async () => {
    if (!summary || reviewingRef.current) return;
    if (isGuest) {
      navigate(videoLoginUrl(video.videoId));
      return;
    }
    const cards = toReelCards(
      summary.items.filter((it) => reviewPicks.has(it.k)),
      gloss,
      translationOf,
    );
    if (!cards.length) return;
    reviewingRef.current = true;
    try {
      const saved = await saveWords(cards, null);
      const wordIds = [...new Set(saved.map((s) => s.wordId))];
      if (!wordIds.length) return;
      setSummary(null);
      const state: WordsSessionState = { wordIds };
      navigate(REVIEW_PATH, { state });
    } catch {
      /* the save error stays silent here, like Studychill's reel */
    } finally {
      reviewingRef.current = false;
    }
  }, [summary, isGuest, navigate, video.videoId, reviewPicks, gloss, translationOf, saveWords]);

  // Saves the selected words that are not in the library yet; the first error goes to the folder form.
  const saveLessonWords = useCallback(
    async (folderId: string | null, items: LessonWordItem[]) => {
      if (!items.length) return;
      await saveWords(toSaveItems(items), folderId);
      const keys = new Set(items.map((it) => it.k));
      items.forEach((it) => savedThisSessionRef.current.set(it.k, { word: it.word, cue: it.cue }));
      setSummary((t) =>
        t ? { ...t, items: t.items.map((x) => (keys.has(x.k) ? { ...x, saved: true } : x)) } : t,
      );
    },
    [saveWords, toSaveItems],
  );

  const closeSummary = useCallback(() => setSummary(null), []);

  const toggleReviewPick = useCallback((k: string) => {
    setReviewPicks((t) => {
      const next = new Set(t);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const selectAllReview = useCallback(
    (selectAll: boolean) => {
      setReviewPicks(selectAll && summary ? new Set(summary.items.map((it) => it.k)) : new Set());
    },
    [summary],
  );

  // ── Keyboard shortcuts (desktop) ──────────────────────────────────────────
  // Space/K play–pause · ←/J previous · →/L next · R replay · S Từng câu ↔ Liền mạch · Esc closes the card.
  // Ignored while typing or with the settings / summary open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || settingsOpen || summary)
        return;
      if (isTyping(e.target)) return;
      const k = e.key;
      if (k === "Escape") {
        if (selectedWord) closeCard();
        return;
      }
      if (k === " " || k === "k" || k === "K") {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (k === "ArrowLeft" || k === "j" || k === "J") {
        e.preventDefault();
        prevCue();
        return;
      }
      if (k === "ArrowRight" || k === "l" || k === "L") {
        e.preventDefault();
        nextCue();
        return;
      }
      if (k === "r" || k === "R") {
        replayCurrent();
        return;
      }
      if (k === "s" || k === "S") changeMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    settingsOpen,
    summary,
    selectedWord,
    closeCard,
    togglePlay,
    prevCue,
    nextCue,
    replayCurrent,
    changeMode,
  ]);

  const loginHref = videoLoginUrl(video.videoId);

  // STABLE callback ref: receives the index from the row instead of a new function per row.
  const registerRow = useCallback((i: number, el: HTMLElement | null) => {
    if (el) rowsRef.current.set(i, el);
    else rowsRef.current.delete(i);
  }, []);

  // Shared word props: only stable values so the memo of rows / paragraphs keeps working.
  const wordProps: WordDisplayProps = {
    showGloss: settings.showGloss,
    showPhonetic: settings.showPhonetic,
    markSaved: settings.markSavedWords,
    gloss,
    savedSet: savedWordSet,
    levels: wordLevels,
    highlightTiers: settings.highlightTiers || "",
    onWord: onWordClick,
    lookups,
  };

  // Meaning above a word / phrase is centred over the LETTERS (not the punctuation glued to it): measured with a
  // Range on the word text → --tam (px from the left of the first cell). A wrapped phrase centres on its first word.
  useLayoutEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return undefined;
    const wordClass = transcriptStyles.w;
    const letterRect = (wrap: HTMLElement) => {
      const w = wrap.querySelector<HTMLElement>(`.${wordClass}`);
      const node = w && w.firstChild;
      if (!w || !node || node.nodeType !== 3) {
        return w ? w.getBoundingClientRect() : wrap.getBoundingClientRect();
      }
      const s = node.textContent || "";
      const firstLetter = s.search(/[\p{L}\p{N}]/u);
      const m = s.match(/[\p{L}\p{N}'’](?=[^\p{L}\p{N}'’]*$)/u);
      if (firstLetter < 0 || !m || m.index === undefined) return w.getBoundingClientRect();
      const r = document.createRange();
      r.setStart(node, firstLetter);
      r.setEnd(node, m.index + 1);
      return r.getBoundingClientRect();
    };
    const measure = () => {
      rootEl.querySelectorAll<HTMLElement>("[data-meaning]").forEach((wrap) => {
        const box = wrap.getBoundingClientRect();
        const a = letterRect(wrap);
        let rightEdge = a.right;
        if (wrap.dataset.phrase) {
          const endWrap = rootEl.querySelector<HTMLElement>(
            `[data-phrase-end="${wrap.dataset.phrase}"]`,
          );
          const b = endWrap && letterRect(endWrap);
          if (b && Math.abs(a.top - b.top) < 4) rightEdge = b.right;
        }
        wrap.style.setProperty("--tam", `${((a.left + rightEdge) / 2 - box.left).toFixed(1)}px`);
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(rootEl);
    return () => ro.disconnect();
  }, [lookups, settings.fontSize, settings.showPhonetic, bySentence]);

  // Empty tray (desktop): tiered words around the playing sentence with meanings — paragraphs have no inline gloss.
  const nearbyWords = useMemo<NearbyWord[]>(() => {
    if (isMobile || !primaryCues.length || !Object.keys(wordLevels).length) return [];
    const center = Math.max(0, activeIndex);
    const nearby: NearbyWord[] = [];
    const seen = new Set<string>();
    for (
      let i = Math.max(0, center - 1);
      i < Math.min(primaryCues.length, center + 5) && nearby.length < 8;
      i += 1
    ) {
      const toks = primaryCues[i][2].split(" ");
      const sfx = markSoundTokens(toks);
      toks.forEach((tok, j) => {
        const cleanWord = cleanToken(tok);
        const k = cleanWord.toLowerCase();
        const tier = wordTier(wordLevels[k]);
        if (sfx[j] || !tier || seen.has(k) || nearby.length >= 8) return;
        seen.add(k);
        nearby.push({ word: cleanWord, k, tier, cue: primaryCues[i] });
      });
    }
    return nearby;
  }, [isMobile, primaryCues, wordLevels, activeIndex]);

  const neededLangs = [primaryLang, secondaryLang].filter(Boolean);
  const loadingSubs = neededLangs.some((l) => !(l in cues)) && !error;
  const tipGloss = tip ? gloss[tip.word] : null;
  const hiddenSettings = isMobile || isTouch ? ["hoverGloss"] : [];
  const floatingCard = isMobile && !!selectedWord; // the card floats as a sheet

  const wordCard = selectedWord ? (
    <WordFlashcard
      key={selectedWord.key}
      word={selectedWord.word}
      gloss={gloss[selectedWord.key] || null}
      info={wordDetails[selectedWord.key] || null}
      cefr={wordLevels[selectedWord.key] || ""}
      context={selectedWord.context}
      contextVi={selectedWord.i >= 0 ? translations[selectedWord.i] || "" : ""}
      contextAt={selectedWord.context ? formatTime(selectedWord.at) : null}
      saved={savedWords[selectedWord.key] || null}
      loading={
        (fetchingGloss && !gloss[selectedWord.key]) ||
        (!gloss[selectedWord.key] && !wordDetails[selectedWord.key])
      }
      saving={saving}
      isGuest={isGuest}
      loginHref={loginHref}
      onSave={saveCurrentWord}
      onNote={saveWordNote}
      onRemove={removeSavedWord}
      onPlayContext={selectedWord.i >= 0 ? () => playClip(selectedWord.i) : null}
      onClose={closeCard}
    />
  ) : null;

  const theme = READER_THEMES.some((n) => n.key === settings.theme) ? settings.theme : "paper";

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-reader-theme={theme}
      data-playing={isPlaying ? "" : undefined}
      data-dragging={split.dragging ? "" : undefined}
    >
      <ReaderHeader
        title={video.title || video.videoId}
        fetchingGloss={fetchingGloss}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        onClose={onClose}
      />

      <div className={styles.split}>
        <section
          ref={mediaRef}
          className={styles.media}
          aria-label="Video"
          style={
            !isMobile && split.splitWidth
              ? {
                  width: `clamp(${MIN_VIDEO_WIDTH}px, ${split.splitWidth}px, calc(100vw - ${MIN_TRANSCRIPT_WIDTH}px))`,
                }
              : undefined
          }
        >
          <ReaderPlayerFrame
            iframeId={IFRAME_ID}
            videoId={video.videoId}
            zoom={settings.zoomVideo}
            embedBlocked={embedBlocked}
            onChooseAnother={onClose}
          >
            {settings.showVideoOverlay && (
              <BilingualSubtitles
                time={time}
                primary={primaryCues}
                secondary={secondaryCues}
                showSecondary={settings.showTranslation}
                onWordClick={(w) => onWordClick(w, null)}
                fontScale={fontScale}
                syncUnavailable={syncUnavailable}
              />
            )}
          </ReaderPlayerFrame>

          {askResume && time < 3 && (
            <ReaderResumePrompt
              resumeAt={resumeAt}
              playerReady={!!player}
              onResume={resumeWatching}
              onDismiss={() => setAskResume(false)}
            />
          )}

          <ReaderTransport
            isPlaying={isPlaying}
            playerReady={!!player}
            activeIndex={activeIndex}
            sentenceCount={primaryCues.length}
            hasActiveCue={!!activeCue}
            loadingSubs={loadingSubs}
            preparingSubs={preparingSubs}
            onPrev={prevCue}
            onReplay={replayCurrent}
            onTogglePlay={togglePlay}
            onNext={nextCue}
            onEnd={openSummary}
          />

          {syncUnavailable && !embedBlocked && (
            <ReaderNotice>{ERROR_REASONS[errorCode] || ERROR_REASONS.general}</ReaderNotice>
          )}

          {!isMobile && (
            <ReaderCurrentSentence
              index={activeIndex}
              total={primaryCues.length}
              cue={activeCue}
              translation={activeIndex >= 0 ? translations[activeIndex] : ""}
              karaokeIndex={karaokeIndex}
              showTranslation={settings.showTranslation}
              hidden={hiddenByCue && activeIndex >= 0 ? hiddenByCue[activeIndex] : null}
              cloze={activeIndex >= 0 ? cloze[activeIndex] : null}
              rewriteTarget={
                rewriteTargets && activeIndex >= 0 ? rewriteTargets[activeIndex] : null
              }
              rewriteTurn={activeIndex >= 0 ? rewrite[activeIndex] : null}
              onSeek={onRowClick}
              {...wordProps}
            />
          )}
          {error && <ReaderNotice onRetry={canRetry ? subs.retry : null}>{error}</ReaderNotice>}

          {!isMobile && (
            <ReaderWordTray
              wordCard={wordCard}
              savedCount={Object.keys(savedWords).length}
              nearbyWords={nearbyWords}
              gloss={gloss}
              isTouch={isTouch}
              isRewrite={isRewrite}
              onWord={(w, cue) => onWordClick(w, cue)}
            />
          )}
        </section>

        {!isMobile && (
          <div
            className={styles.divider}
            role="separator"
            aria-orientation="vertical"
            aria-label="Kéo để đổi độ rộng hai cột (mũi tên trái/phải, Home để đặt lại)"
            tabIndex={0}
            onPointerDown={split.startResize}
            onKeyDown={split.onDividerKey}
            onDoubleClick={split.resetWidth}
            title="Kéo để đổi độ rộng · bấm đúp để về mặc định"
          />
        )}

        <section className={styles.reader} aria-label="Lời thoại song ngữ">
          <ReaderModeBar
            mode={mode}
            onMode={changeMode}
            clozeScore={clozeScore}
            rewriteScore={rewriteScore}
            showTranslation={!!settings.showTranslation}
            onToggleTranslation={toggleTranslation}
            hasLevels={Object.keys(wordLevels).length > 0}
            highlightTiers={settings.highlightTiers || ""}
            onToggleTier={toggleTier}
          />

          <ReaderTranscript
            listRef={listRef}
            fontScale={fontScale}
            hasCues={primaryCues.length > 0}
            loadingSubs={loadingSubs}
            preparingSubs={preparingSubs}
            onUserScroll={onUserScroll}
            onListKeyDown={onListKeyDown}
            onListPointerDown={onListPointerDown}
            onHover={isTouch ? undefined : onHover}
            onHoverEnd={isTouch ? undefined : () => setTip(null)}
            showFollow={!autoScroll && activeIndex >= 0}
            onFollow={backToCurrent}
          >
            {bySentence ? (
              <ReaderRows>
                {primaryCues.map((cue, i) => (
                  <ReaderRow
                    key={`${cue[0]}-${i}`}
                    index={i}
                    cue={cue}
                    translation={translations[i]}
                    active={i === activeIndex}
                    past={activeIndex >= 0 && i < activeIndex}
                    karaokeIndex={i === activeIndex ? karaokeIndex : -1}
                    showTranslation={settings.showTranslation}
                    {...wordProps}
                    onSeek={onRowClick}
                    registerRef={registerRow}
                    hidden={hiddenByCue ? hiddenByCue[i] : null}
                    cloze={cloze[i]}
                    onType={typeBlank}
                    onCheck={checkCue}
                    onReveal={revealCue}
                    onListen={replayCue}
                    rewriteTarget={rewriteTargets ? rewriteTargets[i] : null}
                    rewriteTurn={rewriteTargets ? rewrite[i] : null}
                    onRewriteTurn={commitRewrite}
                    onRewriteListen={listenRewrite}
                    onRewriteNext={nextRewrite}
                    onRewriteRetry={retryRewrite}
                  />
                ))}
              </ReaderRows>
            ) : (
              <ReaderFlow>
                {paragraphs.map((ids) => {
                  const hasActive = activeIndex >= ids[0] && activeIndex <= ids[ids.length - 1];
                  return (
                    <ReaderParagraph
                      key={ids[0]}
                      ids={ids}
                      cues={primaryCues}
                      translations={translations}
                      activeIndex={hasActive ? activeIndex : -1}
                      past={activeIndex > ids[ids.length - 1]}
                      karaokeIndex={hasActive ? karaokeIndex : -1}
                      showTranslation={settings.showTranslation}
                      {...wordProps}
                      onSeek={onRowClick}
                      registerRef={registerRow}
                    />
                  );
                })}
              </ReaderFlow>
            )}
          </ReaderTranscript>
        </section>
      </div>

      {/* Phone: the word card is a bottom sheet (landscape: a panel from the right). */}
      {floatingCard && selectedWord && (
        <ReaderWordSheet word={selectedWord.word} onClose={closeCard}>
          {wordCard}
        </ReaderWordSheet>
      )}

      {/* Tooltip (mouse only): ONE element positioned at the hovered word. */}
      {tip && !isTouch && <ReaderTooltip tip={tip} gloss={tipGloss} />}

      {summary && (
        <VideoLessonSummary
          seconds={summary.seconds}
          sentenceCount={summary.sentenceCount}
          totalSentences={primaryCues.length}
          score={isCloze ? clozeScore : null}
          items={summary.items}
          selected={reviewPicks}
          gloss={gloss}
          isGuest={isGuest}
          loginHref={loginHref}
          lookingUpMeanings={loadingLessonMeanings}
          onToggleSelect={toggleReviewPick}
          onSelectAll={selectAllReview}
          onSave={saveLessonWords}
          onReview={reviewNow}
          onClose={closeSummary}
        />
      )}

      {/* Desktop: the settings drawer slides in from the right (inside the root so it follows the palette). */}
      {!isMobile && settingsOpen && (
        <ReaderSettingsDrawer onClose={() => setSettingsOpen(false)}>
          <ReadingSettingsBody
            value={settings}
            onChange={changeSetting}
            saveWordsReady
            hiddenKeys={hiddenSettings}
          />
        </ReaderSettingsDrawer>
      )}

      <ReadingSettingsSheet
        open={settingsOpen && isMobile}
        value={settings}
        onChange={changeSetting}
        onClose={() => setSettingsOpen(false)}
        saveWordsReady
        dark={isDarkTheme(theme)}
        hiddenKeys={hiddenSettings}
      />
    </div>
  );
}
