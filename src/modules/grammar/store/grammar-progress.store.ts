/**
 * Grammar progress shared by the roadmap column and the lesson column (port of Studychill `grammarStore.js`).
 * Signed in: source is GET me/progress; every action updates optimistically, then takes the server's `lesson`/`stage`
 * and resyncs the whole table (debounced) for `reviewCount` and the stage locks.
 * Guest: same shape kept in localStorage (stage tests always locked).
 * `quickCheck` / `miniTest` / `quickCheckUnits[u].correct` = null means never submitted (different from 0 points).
 */
import { useSyncExternalStore } from "react";

import { grammarApi } from "../api/grammar.api";
import type {
  AttemptResultDto,
  ConfirmablePart,
  LessonPart,
  LessonProgressDto,
  ProgressStatsDto,
  StageProgressDto,
  StudyPositionDto,
} from "../types/grammar.types";
import { GRAMMAR_STAGES, TOPIC_COUNT } from "../utils/grammar-curriculum";
import { pad2 } from "../utils/grammar-text";
import { GRAMMAR_STORAGE_KEYS } from "../utils/storage-keys";

const POSITION_DEBOUNCE_MS = 5000;
const SYNC_DEBOUNCE_MS = 1500;

export type GrammarAuth = "unknown" | "guest" | "user";

export interface GrammarProgressState {
  auth: GrammarAuth;
  loaded: boolean;
  stats: ProgressStatsDto;
  current: StudyPositionDto | null;
  lessons: Record<string, LessonProgressDto>;
  stages: Record<string, StageProgressDto>;
}

const emptyLesson = (): LessonProgressDto => ({
  theoryDone: false,
  vocabDone: false,
  quickCheck: null,
  quickCheckUnits: {},
  miniTest: null,
  miniTestPassed: false,
  passMark: null,
  completed: false,
});

let state: GrammarProgressState = {
  auth: "unknown",
  loaded: false,
  stats: { completedTopics: 0, reviewCount: 0, progressPercent: 0 },
  current: null,
  lessons: {},
  stages: {},
};
const listeners = new Set<() => void>();

function emit(next: GrammarProgressState): void {
  state = next;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getGrammarState = (): GrammarProgressState => state;
export const useGrammarProgress = (): GrammarProgressState =>
  useSyncExternalStore(subscribe, getGrammarState, getGrammarState);

export const lessonOf = (
  s: GrammarProgressState,
  topic: number | string,
): LessonProgressDto | null => s.lessons[pad2(topic)] || null;

/** In progress: a part confirmed or a quick check / mini test submitted (0 points included). */
export function isInProgress(l: LessonProgressDto | null | undefined): boolean {
  return (
    !!l &&
    (l.theoryDone || l.vocabDone || l.miniTestPassed || l.quickCheck != null || l.miniTest != null)
  );
}

interface GuestSnapshot {
  lessons: Record<string, LessonProgressDto>;
  current: StudyPositionDto | null;
}

function readGuest(): GuestSnapshot {
  try {
    const v = JSON.parse(
      localStorage.getItem(GRAMMAR_STORAGE_KEYS.guestProgress) || "{}",
    ) as Partial<GuestSnapshot>;
    const lessons = v.lessons && typeof v.lessons === "object" ? v.lessons : {};
    return {
      lessons: Object.fromEntries(
        Object.entries(lessons).map(([topic, l]) => [topic, { ...emptyLesson(), ...(l || {}) }]),
      ),
      current: v.current || null,
    };
  } catch {
    return { lessons: {}, current: null };
  }
}

function writeGuest(): void {
  try {
    localStorage.setItem(
      GRAMMAR_STORAGE_KEYS.guestProgress,
      JSON.stringify({ lessons: state.lessons, current: state.current }),
    );
  } catch {
    /* private mode: remembered for this visit only */
  }
}

/** Stats + stage unlock recomputed from `lessons` (same definitions as the server). */
function recompute(
  lessons: Record<string, LessonProgressDto>,
  prevState: GrammarProgressState = state,
): Pick<GrammarProgressState, "lessons" | "stages" | "stats"> {
  const rows = Object.values(lessons);
  const partsDone = rows.reduce(
    (n, l) => n + Number(!!l.theoryDone) + Number(!!l.vocabDone) + Number(!!l.miniTestPassed),
    0,
  );
  const stages: Record<string, StageProgressDto> = {};
  GRAMMAR_STAGES.forEach((s) => {
    const total = s.topics.length;
    const doneCount = s.topics.filter((c) => lessons[pad2(c.number)]?.completed).length;
    const required = Math.ceil((total * 4) / 5);
    const old: StageProgressDto | undefined = prevState.stages[s.number];
    stages[s.number] = {
      best: old?.best ?? null,
      passed: old?.passed ?? false,
      total: old?.total ?? 0,
      passMark: old?.passMark ?? null,
      unlocked: prevState.auth === "user" && doneCount * 5 >= total * 4,
      requirement: { completed: doneCount, required, total },
    };
  });
  return {
    lessons,
    stages,
    stats: {
      completedTopics: rows.filter((l) => l.completed).length,
      reviewCount: prevState.stats.reviewCount,
      progressPercent: Math.floor((partsDone * 100) / (TOPIC_COUNT * 3)),
    },
  };
}

function putLesson(topic: number | string, lesson: LessonProgressDto): void {
  const lessons = { ...state.lessons, [pad2(topic)]: lesson };
  emit({ ...state, ...recompute(lessons) });
  if (state.auth === "guest") writeGuest();
}

let loadPromise: Promise<GrammarProgressState> | null = null;
let loadedFor: boolean | null = null;
let isLoading = false;

/**
 * Loads the progress for the current session (`signedIn` from the auth module). Repeated calls run once per session
 * state; `force` reloads when not already loading (Studychill reloads on every page visit).
 */
export function loadProgress({ signedIn, force = false }: { signedIn: boolean; force?: boolean }) {
  if (loadPromise && loadedFor === signedIn && (!force || isLoading)) return loadPromise;
  isLoading = true;
  loadedFor = signedIn;
  loadPromise = (async () => {
    if (signedIn) {
      try {
        const p = await grammarApi.getProgress();
        emit({
          auth: "user",
          loaded: true,
          stats: p.stats,
          current: p.current,
          lessons: p.lessons,
          stages: p.stages,
        });
        return state;
      } catch {
        emit({ ...state, auth: "user", loaded: true });
        return state;
      }
    }
    const k = readGuest();
    const base: GrammarProgressState = {
      ...state,
      auth: "guest",
      loaded: true,
      current: k.current,
      stages: {},
      stats: { ...state.stats, reviewCount: 0 },
    };
    state = base;
    emit({ ...base, ...recompute(k.lessons, base) });
    return state;
  })().finally(() => {
    isLoading = false;
  });
  return loadPromise;
}

let resyncTimer: ReturnType<typeof setTimeout> | undefined;

/** Resyncs the whole table after a burst of actions (review counts, stages). */
export function scheduleResync(): void {
  if (state.auth !== "user") return;
  clearTimeout(resyncTimer);
  resyncTimer = setTimeout(async () => {
    try {
      const p = await grammarApi.getProgress();
      emit({
        ...state,
        stats: p.stats,
        current: state.current || p.current,
        lessons: p.lessons,
        stages: p.stages,
      });
    } catch {
      /* keep the optimistic copy; the next sync catches up */
    }
  }, SYNC_DEBOUNCE_MS);
}

export function adjustReviewCount(delta: number): void {
  emit({
    ...state,
    stats: { ...state.stats, reviewCount: Math.max(0, state.stats.reviewCount + delta) },
  });
}

/** "Tôi đã hiểu bài" / "Đã học qua các từ". */
export async function confirmPart(topic: number, part: ConfirmablePart): Promise<void> {
  const key = part === "theory" ? "theoryDone" : "vocabDone";
  const prev = lessonOf(state, topic) || emptyLesson();
  if (prev[key]) return;
  const optimistic: LessonProgressDto = { ...prev, [key]: true };
  optimistic.completed =
    prev.completed || (optimistic.theoryDone && optimistic.vocabDone && optimistic.miniTestPassed);
  putLesson(topic, optimistic);
  if (state.auth !== "user") return;
  try {
    const res = await grammarApi.completePart(pad2(topic), part);
    putLesson(topic, res.lesson);
    scheduleResync();
  } catch (err) {
    putLesson(topic, prev);
    throw err;
  }
}

/** After submitting a topic block. Signed in: the server's `lesson`; guest: best scores kept locally. */
export function recordLessonAttempt(topic: number, block: string, res: AttemptResultDto): void {
  if (res.lesson) {
    putLesson(topic, res.lesson);
    scheduleResync();
    return;
  }
  if (state.auth !== "guest") return;
  const prev = lessonOf(state, topic) || emptyLesson();
  const l: LessonProgressDto = { ...prev };
  if (block === "mt") {
    const correct = Math.max(prev.miniTest?.correct ?? 0, res.score);
    l.miniTest = { correct, total: res.total };
    l.passMark = res.passMark;
    l.miniTestPassed = prev.miniTestPassed || correct >= (res.passMark ?? Infinity);
  } else {
    const u = block.slice(3);
    const unitScores = {
      ...prev.quickCheckUnits,
      [u]: {
        correct: Math.max(prev.quickCheckUnits?.[u]?.correct ?? 0, res.score),
        total: res.total,
      },
    };
    const scoreList = Object.values(unitScores);
    l.quickCheckUnits = unitScores;
    l.quickCheck = {
      correct: scoreList.reduce((n, x) => n + (x.correct ?? 0), 0),
      total: scoreList.reduce((n, x) => n + x.total, 0),
    };
  }
  l.completed = prev.completed || (l.theoryDone && l.vocabDone && l.miniTestPassed);
  putLesson(topic, l);
}

export function recordStageAttempt(stageNum: string, res: AttemptResultDto): void {
  if (!res.stage) return;
  emit({ ...state, stages: { ...state.stages, [stageNum]: res.stage } });
  scheduleResync();
}

export function setStage(stageNum: string, stage: StageProgressDto): void {
  if (state.auth !== "user") return;
  const { unlocked, best, passed, total, passMark, requirement } = stage;
  emit({
    ...state,
    stages: {
      ...state.stages,
      [stageNum]: { unlocked, best, passed, total, passMark, requirement },
    },
  });
}

let positionTimer: ReturnType<typeof setTimeout> | undefined;
let pendingPosition: StudyPositionDto | null = null;

function sendPosition(): void {
  clearTimeout(positionTimer);
  const v = pendingPosition;
  pendingPosition = null;
  if (!v || state.auth !== "user") return;
  grammarApi.savePosition(v.topic, v.part, v.anchor).catch(() => {});
}

/** Remembers where the learner is (debounced 5 s; leaving the page / closing the tab sends at once). */
export function rememberPosition(topic: number, part: LessonPart, anchor = ""): void {
  const current: StudyPositionDto = { topic: pad2(topic), part, anchor: anchor || "" };
  const prev = state.current;
  if (
    prev &&
    prev.topic === current.topic &&
    prev.part === current.part &&
    (prev.anchor || "") === current.anchor
  )
    return;
  emit({ ...state, current });
  if (state.auth === "guest") {
    writeGuest();
    return;
  }
  pendingPosition = current;
  clearTimeout(positionTimer);
  positionTimer = setTimeout(sendPosition, POSITION_DEBOUNCE_MS);
}

export const flushPosition = sendPosition;

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", sendPosition);
}
