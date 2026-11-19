/**
 * Dictation progress kept per learner (localStorage for guests, server copy for signed-in learners — see
 * learner-store.ts):
 *  - stars per stage { [stageKey]: 1–3 } — the topic map reads them to know which stages are passed;
 *  - the unfinished session of a static source (queue, results, time) to resume it (this browser only);
 *  - study seconds per local day (the play clock adds to it).
 */
import {
  getLearnerSnapshot,
  localDay,
  readSessions,
  updateLearner,
  writeSessions,
} from "./learner-store";

const MAX_SESSIONS = 30;
const KEEP_DAYS = 14;

export interface SavedSession {
  queue: { i: number; done?: boolean; again?: boolean }[];
  pos: number;
  results: Record<string, unknown>;
  elapsed: number;
  updated?: number;
}

export function readDictationProgress(): Record<string, number> {
  return getLearnerSnapshot().stars;
}

/** Records the result of a stage; only the best stars ever reached are kept. */
export function saveCourseResult(stageKey: string, stars: number): void {
  if (!stageKey) return;
  updateLearner(["stars"], (state) => ({
    ...state,
    stars: {
      ...state.stars,
      [stageKey]: Math.max(
        Number(state.stars[stageKey]) || 0,
        Math.min(3, Math.max(1, Number(stars) || 1)),
      ),
    },
  }));
}

/** Unfinished session of a stage or null. */
export function readSession(stageKey: string): SavedSession | null {
  if (!stageKey) return null;
  const session = readSessions<SavedSession>()[stageKey];
  return session && Array.isArray(session.queue) && typeof session.pos === "number"
    ? session
    : null;
}

export function saveSession(stageKey: string, session: SavedSession): void {
  if (!stageKey) return;
  const all = readSessions<SavedSession>();
  all[stageKey] = { ...session, updated: Date.now() };
  // Keep it small: only the most recently opened stages.
  const keys = Object.keys(all).sort((a, b) => (all[b].updated || 0) - (all[a].updated || 0));
  keys.slice(MAX_SESSIONS).forEach((key) => {
    delete all[key];
  });
  writeSessions(all);
}

export function clearSession(stageKey: string): void {
  const all = readSessions<SavedSession>();
  if (!all[stageKey]) return;
  delete all[stageKey];
  writeSessions(all);
}

/** Adds study seconds to today; returns today's total. */
export function addStudySeconds(seconds: number): number {
  const key = localDay();
  let total = 0;
  updateLearner(["dailySeconds"], (state) => {
    total = (Number(state.dailySeconds[key]) || 0) + Math.max(0, Math.round(seconds));
    const dailySeconds = { ...state.dailySeconds, [key]: total };
    Object.keys(dailySeconds)
      .sort()
      .slice(0, -KEEP_DAYS)
      .forEach((day) => {
        delete dailySeconds[day];
      });
    return { ...state, dailySeconds };
  });
  return total;
}

export function studySecondsToday(): number {
  return Number(getLearnerSnapshot().dailySeconds[localDay()]) || 0;
}
