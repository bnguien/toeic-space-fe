/**
 * Dictation play screen (Studychill DictationPlaySession): listen, then write the WHOLE sentence.
 *
 * Layout: top bar (back to map, contents, title, counting-up clock, score, streak) · progress bar · the big
 * sentence card · control rail on the right · shortcut strip below.
 *
 * Sentence loop (SentenceCard): auto-play (pace settings), type word by word (Space = next word), Enter submits.
 * Wrong: the card shakes, right words lock green, wrong letters turn red, missing words get a dashed line; after N
 * wrong submissions (3 basic / 5 Pro) the answer opens. The answer button only opens after a first try. A first
 * pass without hints is "clean"; stage stars follow the share of clean sentences.
 * Topic packs: a revealed sentence comes back 4 sentences later. TOEIC roadmap (`source.mustPass`): a sentence that
 * does not unlock the next one (from level 3: passed with help) must be typed again before moving on.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  ListOrdered,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Timer,
} from "lucide-react";

import { cx } from "@/shared/components/ui";
import { formatClock, starsFor } from "@/shared/utils/dictation-check";
import { StudyBackdrop, useReelBackgrounds } from "@/modules/vocabulary";

import { useAudioClip } from "../../hooks/useAudioClip";
import { useSentenceSpeech } from "../../hooks/useSentenceSpeech";
import type { AudioKind, PlayItem, PlaySource, SentenceResult } from "../../types/play.types";
import { startLofiMusic, stopLofiMusic } from "../../utils/audio-synth";
import {
  addStudySeconds,
  clearSession,
  readSession,
  saveCourseResult,
  saveSession,
  studySecondsToday,
} from "../../utils/dictation-progress";
import {
  SLOW_RATE,
  loadSettings,
  patchSettings,
  saveSettings,
  type PlaySettings,
  type SoundChoice,
} from "../../utils/dictation-settings";
import { MASCOT } from "../../utils/mascot";
import { playSfx } from "../../utils/sfx";
import { DictationPlaySettings } from "./DictationPlaySettings";
import { FinishScreen, type FinishSummary } from "./FinishScreen";
import { SentenceCard, type SentenceOutcome } from "./SentenceCard";
import { TocDrawer, type PlayRow } from "./TocDrawer";
import buttons from "./PlayButtons.module.css";
import theme from "./PlayTheme.module.css";
import styles from "./DictationPlaySession.module.css";

/** A revealed sentence comes back 4 sentences later: far enough to recall, near enough not to forget. */
const AGAIN_GAP = 4;
/** Video backdrop: the scene changes every 8 sentences, like the notebook's Reel mode. */
const SCENE_EVERY = 8;
/** 90 s without typing or clicking stops the clock (no "idle" time counted). */
const IDLE_MS = 90 * 1000;

interface QueueEntry {
  i: number;
  done?: boolean;
  again?: boolean;
}

interface SessionState {
  queue: QueueEntry[];
  pos: number;
  results: Record<string, SentenceResult>;
  elapsed?: number;
}

const freshQueue = (count: number, done: boolean[] = []): QueueEntry[] =>
  Array.from({ length: count }, (_, i) => (done[i] ? { i, done: true } : { i }));

function restore(key: string, count: number): SessionState | null {
  const saved = readSession(key);
  if (!saved || !saved.queue.length || saved.queue.some((e) => !(e.i >= 0 && e.i < count)))
    return null;
  return {
    queue: saved.queue,
    pos: Math.min(saved.pos, saved.queue.length - 1),
    results: (saved.results || {}) as Record<string, SentenceResult>,
    elapsed: saved.elapsed || 0,
  };
}

/** Next unlocked sentence not done yet (wrapping round when the learner jumped ahead); −1 = all done. */
function nextPending(queue: QueueEntry[], pos: number, unlocked: boolean[]): number {
  const open = (e: QueueEntry) => !e.done && unlocked[e.i] !== false;
  for (let k = pos + 1; k < queue.length; k += 1) if (open(queue[k])) return k;
  for (let k = 0; k < pos; k += 1) if (open(queue[k])) return k;
  return -1;
}

const darkQuery =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
const subscribeDark = (listener: () => void) => {
  darkQuery?.addEventListener("change", listener);
  return () => darkQuery?.removeEventListener("change", listener);
};
const readDark = () => Boolean(darkQuery?.matches);

function useFullscreen(): [boolean, () => void] {
  const [on, setOn] = useState(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement),
  );
  useEffect(() => {
    const sync = () => setOn(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);
  return [on, toggle];
}

const errorText = (error: unknown): string => {
  const response = (error as { response?: { data?: { detail?: string } } })?.response;
  return response?.data?.detail || (error as Error)?.message || "Không tải được câu này.";
};

export interface DictationPlaySessionProps {
  source: PlaySource;
  mode: "basic" | "pro";
  sound?: SoundChoice;
  onExit: () => void;
}

export function DictationPlaySession({
  source,
  mode: modeProp,
  sound = {},
  onExit,
}: DictationPlaySessionProps) {
  const mode = modeProp === "pro" ? "pro" : "basic";
  const total = source.entries.length;
  const [settings, setSettingsState] = useState<PlaySettings>(() => loadSettings(mode, sound));
  const [saved] = useState(() => (source.persist ? restore(source.key, total) : null));
  const [session, setSession] = useState<SessionState>(() => {
    if (saved) return saved;
    // TOEIC roadmap: sentences passed before count as done; start at the first open sentence not passed yet.
    const queue = freshQueue(total, source.initialDone);
    const first = queue.findIndex((e) => !e.done && source.unlocked?.[e.i] !== false);
    return { queue, pos: Math.max(0, first), results: {} };
  });
  const [unlocked, setUnlocked] = useState<boolean[]>(
    () => source.unlocked || Array<boolean>(total).fill(true),
  );
  const [items, setItems] = useState<Record<number, PlayItem>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(saved?.elapsed || 0);
  const [resumeNote, setResumeNote] = useState(
    Boolean(saved && (saved.pos > 0 || Object.keys(saved.results).length)),
  );
  const [paused, setPaused] = useState(false);
  const [idle, setIdle] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [panel, setPanel] = useState<"toc" | "settings" | null>(null);
  const [finished, setFinished] = useState<FinishSummary | null>(null);
  const [streak, setStreak] = useState(0);
  const [retry, setRetry] = useState(0); // changes the card key for "redo this sentence"
  const [direction, setDirection] = useState<"up" | "down">("up");
  // Word rounds in between (source.interludeAt): only when reaching the sentence in order (not from the contents
  // or while browsing back), once per round and session.
  const [viaFlow, setViaFlow] = useState(true);
  const [learned, setLearned] = useState<Set<string>>(() => new Set());
  const speech = useSentenceSpeech();
  const clip = useAudioClip();
  const systemDark = useSyncExternalStore(subscribeDark, readDark, () => false);
  const dark = settings.appearance === "dark" || (settings.appearance === "system" && systemDark);
  const [fullscreen, toggleFullscreen] = useFullscreen();
  const [sceneShift, setSceneShift] = useState(() => source.key.length * 7);

  const { queue, pos, results } = session;
  const entry = queue[pos];
  const meta = source.entries[entry?.i] || source.entries[0];
  const item = items[entry?.i] || source.peek(entry?.i);
  const doneSet = new Set(queue.filter((e) => e.done).map((e) => e.i));
  const doneCount = doneSet.size;
  const cleanCount = Object.values(results).filter((r) => r.status === "clean").length;

  // ── Video backdrop: the notebook Reel clips ──
  const backgrounds = useReelBackgrounds(settings.backdrop === "video");
  const clips = backgrounds.data ?? [];
  const scene = settings.backdrop === "video" && clips.length > 0;
  const videoError = backgrounds.isError
    ? "Không tải được video nền."
    : backgrounds.isSuccess && !clips.length
      ? "Chưa có video nền."
      : "";

  const updateSettings = useCallback(
    (patch: Partial<PlaySettings>) =>
      setSettingsState((current) => {
        const next = patchSettings(current, patch);
        saveSettings(mode, next);
        return next;
      }),
    [mode],
  );

  // ── Load the current sentence (frame + meaning + proofs from the server) ──
  const [loadTick, setLoadTick] = useState(0);
  useEffect(() => {
    if (!entry || items[entry.i] || source.peek(entry.i)) return undefined;
    let alive = true;
    source
      .prepare(entry.i)
      .then((loaded) => {
        if (!alive) return;
        setItems((all) => ({ ...all, [entry.i]: loaded }));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (alive) setLoadError(errorText(error));
      });
    return () => {
      alive = false;
    };
  }, [entry, items, source, loadTick]);

  // ── Counting-up clock: only while really studying (not paused, not idle, tab visible) ──
  const lastActivity = useRef(0);
  const unsavedDaily = useRef(0);
  const elapsedRef = useRef(elapsed);
  useLayoutEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);
  const running = !paused && !idle && !hidden && !finished;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
      unsavedDaily.current += 1;
      if (unsavedDaily.current >= 15) {
        addStudySeconds(unsavedDaily.current);
        unsavedDaily.current = 0;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now();
      setIdle(false);
    };
    lastActivity.current = Date.now();
    const onVisible = () => setHidden(document.visibilityState === "hidden");
    const check = setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_MS) setIdle(true);
    }, 5000);
    window.addEventListener("keydown", touch);
    window.addEventListener("pointerdown", touch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(check);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("pointerdown", touch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Save the session when progress changes + every 15 s for the time; leaving adds the rest of today's time.
  useEffect(() => {
    if (source.persist && !finished)
      saveSession(source.key, { ...session, elapsed: elapsedRef.current });
  }, [session, finished, source]);
  useEffect(() => {
    if (!source.persist) return undefined;
    const id = setInterval(() => {
      if (!finished) saveSession(source.key, { ...session, elapsed: elapsedRef.current });
    }, 15000);
    return () => clearInterval(id);
  }, [session, finished, source]);
  useEffect(
    () => () => {
      if (unsavedDaily.current) addStudySeconds(unsavedDaily.current);
      unsavedDaily.current = 0;
    },
    [],
  );

  useEffect(() => {
    if (!resumeNote) return undefined;
    const id = setTimeout(() => setResumeNote(false), 8000);
    return () => clearTimeout(id);
  }, [resumeNote]);

  // ── Background music + stop the voice when paused ──
  useEffect(() => {
    if (settings.backgroundMusic && running) startLofiMusic();
    else stopLofiMusic();
    return () => stopLofiMusic();
  }, [settings.backgroundMusic, running]);
  const { stop: stopSpeech } = speech;
  const { stop: stopClip } = clip;
  const stopAudio = useCallback(() => {
    stopSpeech();
    stopClip();
  }, [stopSpeech, stopClip]);
  useEffect(() => {
    if (paused || finished) stopAudio();
  }, [paused, finished, stopAudio]);

  // ── Voice of the current sentence: server mp3, browser voice as fallback ──
  const play = useCallback(
    (kind: AudioKind = "normal"): Promise<boolean> => {
      if (!item) return Promise.resolve(false);
      const spec = source.audio(item, kind, settings);
      if (!spec) return Promise.resolve(false);
      const times = kind === "normal" ? settings.repeat : 1;
      const rate = kind === "slow" ? SLOW_RATE : spec.rate;
      if (spec.url) {
        speech.stop();
        // Server audio failed → read it with the browser voice, only once the text is known (never leaks the answer).
        const onFail =
          spec.text && speech.supported
            ? () => speech.play(spec.text, { lang: spec.lang, rate, times })
            : null;
        return clip.play(spec.url, { rate, times, onFail });
      }
      clip.stop();
      return speech.play(spec.text, { lang: spec.lang, rate, times });
    },
    [item, source, settings, speech, clip],
  );

  // ── Navigation ──
  const finish = useCallback(
    (state: SessionState) => {
      if (source.onFinish) {
        if (unsavedDaily.current) {
          addStudySeconds(unsavedDaily.current);
          unsavedDaily.current = 0;
        }
        source.onFinish(state.results, elapsedRef.current);
        return;
      }
      const stars = starsFor(state.results, total);
      saveCourseResult(source.key, stars);
      clearSession(source.key);
      if (unsavedDaily.current) {
        addStudySeconds(unsavedDaily.current);
        unsavedDaily.current = 0;
      }
      if (settings.feedbackSound) playSfx("finish");
      setFinished({ stars, elapsed: elapsedRef.current, today: studySecondsToday() });
    },
    [total, source, settings.feedbackSound],
  );

  const goTo = useCallback(
    (k: number, dir: "up" | "down" = "up", flow = false) => {
      stopAudio();
      setDirection(dir);
      setViaFlow(flow);
      setSession((s) => ({ ...s, pos: k }));
      if (settings.feedbackSound) playSfx("swipe");
    },
    [stopAudio, settings.feedbackSound],
  );

  const goNext = useCallback(() => {
    const k = nextPending(queue, pos, unlocked);
    if (k !== -1) {
      goTo(k, "up", true);
      return;
    }
    if (queue.every((e) => e.done)) finish(session);
  }, [queue, pos, unlocked, session, finish, goTo]);

  /** Browsing (a finished sentence): the next one in order, else back to the unfinished ones. */
  const browseNext = useCallback(() => {
    if (pos + 1 < queue.length && unlocked[queue[pos + 1].i] !== false) goTo(pos + 1, "up");
    else goNext();
  }, [pos, queue, unlocked, goTo, goNext]);
  const browsePrev = useCallback(() => {
    if (pos > 0) goTo(pos - 1, "down");
  }, [pos, goTo]);

  const onDone = useCallback(
    (result: SentenceOutcome) => {
      const key = meta.key;
      // TOEIC roadmap: a sentence is done only when it unlocks the next one (server rule, guests the same rule).
      const done = source.mustPass ? Boolean(result.unlocks) : true;
      setSession((s) => {
        const current = s.queue[s.pos];
        let nextQueue = s.queue.map((e, k) => (k === s.pos ? { ...e, done: e.done || done } : e));
        const previous = s.results[key];
        const record: SentenceResult = previous
          ? {
              ...previous,
              retry: result.status,
              words: result.words,
              marks: result.marks,
              display: result.display || previous.display,
            }
          : result;
        const pending = nextQueue.some((e, k) => k > s.pos && e.i === current.i && !e.done);
        if (!source.mustPass && result.status === "revealed" && !pending) {
          const at = Math.min(nextQueue.length, s.pos + 1 + AGAIN_GAP);
          nextQueue = [
            ...nextQueue.slice(0, at),
            { i: current.i, again: true },
            ...nextQueue.slice(at),
          ];
        }
        return { ...s, queue: nextQueue, results: { ...s.results, [key]: record } };
      });
      if (result.unlocks && entry.i + 1 < total)
        setUnlocked((u) => u.map((v, k) => (k === entry.i + 1 ? true : v)));
      if (result.known) {
        const known = result.known;
        setItems((all) => {
          const base = all[entry.i] || item;
          return base
            ? {
                ...all,
                [entry.i]: {
                  ...base,
                  known,
                  display: result.display || "",
                  translation: result.translation || base.translation,
                },
              }
            : all;
        });
      }
      if (!entry.again) setStreak((n) => (result.status === "clean" ? n + 1 : 0));
    },
    [meta, entry, item, source, total],
  );

  const jumpTo = useCallback(
    (i: number) => {
      if (unlocked[i] === false) return;
      setPanel(null);
      let k = queue.findIndex((e) => e.i === i && !e.done);
      if (k === -1) k = queue.map((e) => e.i).lastIndexOf(i);
      if (k === -1) {
        setSession((s) => ({
          ...s,
          queue: [...s.queue.slice(0, s.pos + 1), { i }, ...s.queue.slice(s.pos + 1)],
        }));
        k = pos + 1;
      }
      goTo(k, k < pos ? "down" : "up");
    },
    [queue, pos, unlocked, goTo],
  );

  const retryCurrent = useCallback(() => {
    setSession((s) => ({
      ...s,
      queue: s.queue.map((e, k) => (k === s.pos ? { ...e, done: false } : e)),
    }));
    setRetry((n) => n + 1);
  }, []);

  const restartAll = useCallback(() => {
    stopAudio();
    clearSession(source.key);
    setSession({ queue: freshQueue(total), pos: 0, results: {} });
    setElapsed(0);
    setStreak(0);
    setFinished(null);
    setResumeNote(false);
    setRetry((n) => n + 1);
  }, [stopAudio, source.key, total]);

  const reviewMissed = useCallback((indexes: number[]) => {
    setSession((s) => ({ ...s, queue: indexes.map((i) => ({ i, again: true })), pos: 0 }));
    setFinished(null);
    setRetry((n) => n + 1);
  }, []);

  // Esc closes the open panel.
  useEffect(() => {
    if (!panel) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPanel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const rows: PlayRow[] = source.entries.map((en, i) => {
    const loaded = items[i] || source.peek(i);
    const result = results[en.key];
    const done = doneSet.has(i);
    return {
      i,
      key: en.key,
      number: en.number,
      status: result?.status || (done ? "passed" : null),
      sentence: result?.display || (done && loaded?.known ? loaded.display : ""),
      translation: loaded?.translation || "",
      locked: unlocked[i] === false,
      done: done || Boolean(result),
    };
  });

  const doneResult = entry?.done ? results[meta.key] || null : null;
  const interlude =
    viaFlow && entry && !entry.done && !finished ? source.interludeAt?.(entry.i) : null;
  const showInterlude = Boolean(interlude) && !learned.has(interlude!.key);
  const interludeKey = interlude?.key;
  const finishInterlude = () => {
    if (interludeKey) setLearned((all) => new Set(all).add(interludeKey));
  };
  const clockState = paused
    ? "Đang tạm dừng"
    : hidden
      ? "Dừng khi rời tab"
      : idle
        ? "Tự dừng vì bạn đang nghỉ"
        : "Thời gian học";

  return (
    <div
      className={cx(theme.theme, scene && styles.hasVideo)}
      data-color-mode={dark ? "dark" : undefined}
      onMouseDown={(event) => {
        // Top bar / rail buttons never take the focus: Enter stays with the sentence being written.
        const element = event.target as Element;
        if (element.closest("button") && !element.closest("[data-play-panel], [data-play-card]"))
          event.preventDefault();
      }}
    >
      {scene ? (
        <div className={styles.backdrop}>
          <StudyBackdrop
            kind="video"
            backgrounds={clips}
            scene={Math.floor(doneCount / SCENE_EVERY) + sceneShift}
          />
        </div>
      ) : (
        <div className={styles.bubbles} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}

      <header className={styles.top}>
        <div className={styles.topLeft}>
          <button type="button" className={styles.ghost} onClick={onExit}>
            <ArrowLeft size={16} />{" "}
            <span className={styles.hideSmall}>{source.backLabel || "Bản đồ"}</span>
          </button>
          <button type="button" className={styles.ghost} onClick={() => setPanel("toc")}>
            <ListOrdered size={16} /> <span className={styles.hideSmall}>Mục lục</span>
          </button>
        </div>
        <div className={styles.title}>
          <strong>{source.title || "Dictation"}</strong>
          <span>
            {source.subtitle && <em className={styles.hideSmall}>{source.subtitle} · </em>}
            {mode === "pro" ? "Pro" : "Cơ bản"} · Câu {Math.min(doneCount + 1, total)}/{total}
          </span>
        </div>
        <div className={styles.topRight}>
          <button
            type="button"
            className={cx(styles.clock, !running && styles.clockStopped)}
            onClick={() => setPaused((p) => !p)}
            title={`${clockState} — bấm để ${paused ? "tiếp tục" : "tạm dừng"}`}
            aria-label={`${clockState} ${formatClock(elapsed)}`}
          >
            <Timer size={16} />
            <b>{formatClock(elapsed)}</b>
            {paused ? (
              <Play size={13} fill="currentColor" />
            ) : (
              <Pause size={13} fill="currentColor" />
            )}
          </button>
          <span className={styles.score} title="Câu đạt sạch (lần đầu, không gợi ý)">
            ✓ {cleanCount}
          </span>
          {streak >= 2 && (
            <span className={styles.streak} title="Chuỗi câu sạch liên tiếp">
              <Flame size={14} /> {streak}
            </span>
          )}
        </div>
      </header>
      <div className={styles.progress} aria-hidden="true">
        <i style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
      {!running && !paused && !finished && (
        <p className={styles.clockNote} role="status">
          {clockState} · gõ hoặc bấm bất kỳ để đếm tiếp
        </p>
      )}
      {resumeNote && !finished && (
        <div className={styles.resume} role="status">
          <span>
            Tiếp tục từ chỗ đang dở · đã làm {doneCount}/{total} câu · {formatClock(elapsed)}
          </span>
          <button type="button" onClick={restartAll}>
            Làm lại từ đầu
          </button>
          <button type="button" onClick={() => setResumeNote(false)} aria-label="Đóng">
            ✕
          </button>
        </div>
      )}
      {source.guestNote && !finished && (
        <div className={styles.resume} role="status">
          <span>{source.guestNote}</span>
          {source.onLogin && (
            <button type="button" onClick={source.onLogin}>
              Đăng nhập
            </button>
          )}
        </div>
      )}

      {finished ? (
        <FinishScreen
          title={source.title}
          rows={rows}
          summary={finished}
          onReview={source.mustPass ? null : reviewMissed}
          onRestart={restartAll}
          onExit={onExit}
        />
      ) : (
        <div className={styles.stage}>
          <div
            className={cx(styles.cardWrap, direction === "up" ? styles.enterUp : styles.enterDown)}
            key={`${pos}-${entry.i}-${retry}`}
            data-play-card=""
          >
            {showInterlude ? (
              <article className={cx(styles.card, styles.cardWait)}>
                <p>Học nhanh từ vựng trước khi viết câu…</p>
              </article>
            ) : item ? (
              <SentenceCard
                item={item}
                source={source}
                again={Boolean(entry.again)}
                done={doneResult}
                settings={settings}
                inactive={Boolean(panel) || paused}
                speaking={speech.playing || clip.playing}
                audioFailed={clip.failed}
                play={play}
                onDone={onDone}
                onBrowse={browseNext}
                onAdvance={goNext}
                onRetry={retryCurrent}
                hasNext={nextPending(queue, pos, unlocked) !== -1}
                streak={streak}
              />
            ) : (
              <article className={cx(styles.card, styles.cardWait)}>
                {loadError ? (
                  <div className={styles.waitError}>
                    <img src={MASCOT.thinking} alt="" />
                    <p>{loadError}</p>
                    <button
                      type="button"
                      className={cx(buttons.button, buttons.primary)}
                      onClick={() => {
                        setLoadError(null);
                        setLoadTick((n) => n + 1);
                      }}
                    >
                      <RefreshCw size={16} /> Thử lại
                    </button>
                  </div>
                ) : (
                  <p>
                    <RefreshCw size={22} className={buttons.spin} /> Đang nạp câu {meta.number}…
                  </p>
                )}
              </article>
            )}
            {paused && (
              <button type="button" className={styles.paused} onClick={() => setPaused(false)}>
                <Play size={38} fill="currentColor" />
                <span>Đang tạm dừng · bấm để học tiếp</span>
              </button>
            )}
          </div>

          <aside className={styles.rail} aria-label="Điều khiển">
            <RailButton
              label={paused ? "Tiếp tục" : "Tạm dừng"}
              active={paused}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? (
                <Play size={20} fill="currentColor" />
              ) : (
                <Pause size={20} fill="currentColor" />
              )}
            </RailButton>
            <RailButton
              label="Mục lục"
              active={panel === "toc"}
              onClick={() => setPanel((p) => (p === "toc" ? null : "toc"))}
            >
              <ListOrdered size={20} />
            </RailButton>
            <RailButton
              label="Cài đặt"
              active={panel === "settings"}
              onClick={() => setPanel((p) => (p === "settings" ? null : "settings"))}
            >
              <Settings2 size={20} />
            </RailButton>
            <RailButton label={fullscreen ? "Thu nhỏ" : "Toàn màn"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </RailButton>
            <div className={styles.railNav}>
              <button
                type="button"
                onClick={browsePrev}
                disabled={pos === 0}
                aria-label="Câu trước"
                title="Câu trước"
              >
                <ChevronUp size={20} />
              </button>
              <button
                type="button"
                onClick={browseNext}
                disabled={!entry.done}
                aria-label="Câu sau"
                title={entry.done ? "Câu sau" : "Làm xong câu này để sang câu sau"}
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {!finished && (
        <footer className={styles.keys} aria-label="Phím tắt">
          <span>
            <kbd>Ctrl</kbd> nghe lại
          </span>
          <span>
            <kbd>Alt</kbd> nghe chậm
          </span>
          <span>
            <kbd>Space</kbd> sang từ kế
          </span>
          <span>
            <kbd>Enter</kbd> kiểm tra / câu tiếp
          </span>
          <span>
            <kbd>Tab</kbd> gợi ý
          </span>
          <span>
            <kbd>Shift</kbd>+<kbd>Tab</kbd> hé cả từ
          </span>
          <span>
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> xem đáp án
          </span>
          <span>
            <kbd>Esc</kbd> xoá gõ lại
          </span>
          <span>
            <kbd>←</kbd>
            <kbd>→</kbd> đổi từ
          </span>
        </footer>
      )}

      {showInterlude && interlude && interlude.render(finishInterlude)}
      {panel === "toc" && (
        <TocDrawer
          rows={rows}
          currentIndex={entry?.i}
          onJump={jumpTo}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "settings" && (
        <DictationPlaySettings
          settings={settings}
          mode={mode}
          source={source}
          hasVideo={scene}
          videoError={videoError}
          onShuffleScene={() => setSceneShift((n) => n + 1)}
          onChange={updateSettings}
          onClose={() => setPanel(null)}
          onPreview={(kind) => void play(kind)}
        />
      )}
    </div>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cx(styles.railButton, active && styles.railActive)}
      onClick={onClick}
      title={label}
    >
      <span>{children}</span>
      <small>{label}</small>
    </button>
  );
}
