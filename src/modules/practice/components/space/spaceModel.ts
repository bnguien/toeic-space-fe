/**
 * Pure model of the practice space (port of StudyChill `PracticeSpacePage` + `spaceData`): series of
 * tests, practice sets per part, card states, the overview figures, the stats drawer charts and the
 * history list. Every figure comes from server data; nothing here invents numbers. Pure: Node tests
 * load it directly (only `import type` from outside, `.ts` extensions inside the module).
 */
import type {
  ActiveTestAttempt,
  AttemptMode,
  AttemptSource,
  AttemptStatus,
  AttemptSummary,
  PracticeStats,
  SetProgress,
  TestCategory,
  TestProgress,
  ToeicTest,
} from "../../types/practice-exam.types.ts";
import { PART_META, isListeningPart, levelTargetLabel } from "../../utils/parts.ts";

/* ---- Practice sets (shape of `GET practice-sets` items) ---- */

export type PracticeSetKind = "Level" | "Topic" | "PartDrill";

export interface PracticeSetItem {
  id: string;
  code: string;
  title: string;
  kind: PracticeSetKind;
  /** "Part1".."Part7" */
  part: string;
  level: number | null;
  targetScore: number | null;
  durationMinutes: number;
  orderIndex: number;
  questionCount: number;
}

/** "Part3" / "3" / 3 → 3 (0 when unknown). */
export function partNumberOf(part: string | number): number {
  const n = typeof part === "number" ? part : Number(String(part).replace(/\D/g, ""));
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : 0;
}

/** Sets of one part in display order (level, then the editor's order). */
export function setsOfPart(sets: readonly PracticeSetItem[], part: number): PracticeSetItem[] {
  return sets
    .filter((set) => partNumberOf(set.part) === part)
    .sort(
      (a, b) =>
        kindRank(a.kind) - kindRank(b.kind) ||
        (a.level ?? 99) - (b.level ?? 99) ||
        a.orderIndex - b.orderIndex ||
        a.code.localeCompare(b.code),
    );
}

const kindRank = (kind: PracticeSetKind) => (kind === "Level" ? 0 : kind === "PartDrill" ? 1 : 2);

/** Main label of a set card: "Căn bản 450+", "200 câu thực chiến", or the topic title. */
export function setHeadline(set: PracticeSetItem): string {
  if (set.kind === "Level") return levelTargetLabel(set.level, set.targetScore) ?? set.title;
  if (set.kind === "PartDrill") return `${set.questionCount} câu thực chiến`;
  return set.title;
}

/** Big number of a set card: target score ("450+") or the question count. */
export function setTarget(set: PracticeSetItem): string | null {
  if (set.targetScore) return `${set.targetScore}+`;
  return null;
}

export const setKindLabel = (kind: PracticeSetKind) =>
  kind === "Level" ? "Theo cấp độ" : kind === "PartDrill" ? "Luyện Part" : "Theo chủ đề";

/* ---- Tests and series ---- */

/** "Test 07" number of a test from its code or title ("ETS-2026-TEST-07" → "07"). */
export function testNumber(test: Pick<ToeicTest, "code" | "title">): string {
  const match = /(\d+)\s*$/.exec(test.code) ?? /(\d+)\s*$/.exec(test.title);
  return match ? match[1].padStart(2, "0") : "";
}

export const testLabel = (test: Pick<ToeicTest, "code" | "title">) => {
  const number = testNumber(test);
  return number ? `Test ${number}` : test.title;
};

export interface TestSeries {
  /** Category name; also the `?series=` value. */
  key: string;
  label: string;
  tests: ToeicTest[];
}

export const OTHER_SERIES = "Đề khác";

/**
 * Exam series = test categories (server order), each with its published tests sorted by code.
 * Tests without a category fall into "Đề khác"; empty categories are dropped.
 */
export function buildSeries(
  categories: readonly TestCategory[],
  tests: readonly ToeicTest[],
): TestSeries[] {
  const byKey = new Map<string, ToeicTest[]>();
  for (const test of tests) {
    const key = test.category?.trim() || OTHER_SERIES;
    byKey.set(key, [...(byKey.get(key) ?? []), test]);
  }
  const order = [
    ...categories.map((c) => c.category),
    ...[...byKey.keys()].filter((key) => !categories.some((c) => c.category === key)),
  ];
  return order
    .filter((key, index) => order.indexOf(key) === index && byKey.has(key))
    .map((key) => ({
      key,
      label: key,
      tests: [...(byKey.get(key) ?? [])].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true }),
      ),
    }));
}

/* ---- Card states ---- */

export type ProgressStatus = "done" | "doing" | "todo";
export type CardState = "next" | ProgressStatus;

export interface ItemProgress {
  status: ProgressStatus;
  /** 0..100 */
  percent: number;
}

const ratio = (value: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

/** Card progress of a test from `tests-progress` (absent = never touched). */
export function testProgressOf(progress: TestProgress | undefined): ItemProgress & {
  best: number | null;
  activeMode: AttemptMode | null;
} {
  if (!progress) return { status: "todo", percent: 0, best: null, activeMode: null };
  const best = progress.bestTotalScaled;
  if (progress.status === "InProgress" || progress.activeAttemptId)
    return {
      status: "doing",
      percent: ratio(progress.answeredCount, progress.totalQuestions),
      best,
      activeMode: progress.activeMode,
    };
  if (progress.status === "Completed" || progress.completedCount > 0)
    return { status: "done", percent: 100, best, activeMode: null };
  return { status: "todo", percent: 0, best, activeMode: null };
}

/** Card progress of a practice set from `sets-progress` (distinct questions answered). */
export function setProgressOf(
  progress: SetProgress | undefined,
  questionCount: number,
): ItemProgress & { answered: number; total: number; wrong: number } {
  const total = progress?.totalQuestions || questionCount;
  const answered = Math.min(progress?.answeredQuestions ?? 0, total);
  const wrong = progress?.wrongQuestions ?? 0;
  if (total > 0 && answered >= total)
    return { status: "done", percent: 100, answered, total, wrong };
  if (answered > 0 || progress?.activeAttemptId)
    return { status: "doing", percent: ratio(answered, total), answered, total, wrong };
  return { status: "todo", percent: 0, answered, total, wrong };
}

/** The item to suggest: the first one in progress, else the first not finished. */
export function pickNext<T>(items: readonly T[], progressOf: (item: T) => ItemProgress): T | null {
  return (
    items.find((item) => progressOf(item).status === "doing") ??
    items.find((item) => progressOf(item).status !== "done") ??
    null
  );
}

export const cardStateOf = (progress: ItemProgress, isNext: boolean): CardState =>
  isNext && progress.status !== "done" ? "next" : progress.status;

/** Tag of a card: "Đã nộp" / "Làm tiếp" / "Bắt đầu" / fallback. */
export function cardTag(state: CardState, percent: number, fallback: string, doneLabel = "Đã nộp") {
  if (state === "done") return doneLabel;
  if (state === "next") return percent > 0 ? "Làm tiếp" : "Bắt đầu";
  if (state === "doing") return "Đang làm";
  return fallback;
}

export interface PoolSummary {
  total: number;
  doing: number;
  done: number;
  /** Average progress 0..100 (finished items count as 100). */
  percent: number;
}

/** Overview metric row: "Đề luyện · Đang làm · Đã nộp x/N" + the goal bar. */
export function summarizePool(progress: readonly ItemProgress[]): PoolSummary {
  const total = progress.length;
  const done = progress.filter((p) => p.status === "done").length;
  const doing = progress.filter((p) => p.status === "doing").length;
  const percent = total
    ? Math.round(
        progress.reduce((sum, p) => sum + (p.status === "done" ? 100 : p.percent), 0) / total,
      )
    : 0;
  return { total, doing, done, percent };
}

/* ---- Exam config dialog ---- */

export type ConfigMode = "Practice" | "FullTest";

export const sameParts = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && [...a].sort().every((part, i) => part === [...b].sort()[i]);

/** Mode of an in-progress attempt as the dialog sees it ("PartPractice" counts as Practice). */
export const configModeOf = (mode: AttemptMode | null | undefined): ConfigMode =>
  mode === "FullTest" ? "FullTest" : "Practice";

export type ActiveRelation = "none" | "same" | "conflict";

/**
 * How the in-progress attempt of a test relates to the chosen configuration. The server returns the
 * in-progress attempt whatever is requested, so a different mode or part set is a conflict the
 * learner must resolve (continue that attempt, or restart with the new configuration).
 */
export function activeRelation(
  active: Pick<ActiveTestAttempt, "attemptId" | "mode" | "parts"> | null | undefined,
  mode: ConfigMode,
  parts: readonly number[],
): ActiveRelation {
  if (!active?.attemptId) return "none";
  const activeMode = configModeOf(active.mode);
  if (activeMode !== mode) return "conflict";
  if (mode === "Practice" && active.parts.length > 0 && !sameParts(active.parts, parts))
    return "conflict";
  return "same";
}

export const modeLabel = (mode: AttemptMode | ConfigMode | null | undefined) =>
  mode === "FullTest" ? "Thi thử" : "Luyện tập";

/** "Part 1, 3, 5" — or "cả đề" for all seven parts. */
export function partsLabel(parts: readonly number[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 7) return "cả đề";
  return `Part ${[...parts].sort((a, b) => a - b).join(", ")}`;
}

export const AUDIO_SPEEDS = [
  { value: 1, label: "1.0×", description: "Tốc độ chuẩn của đề thi." },
  { value: 1.15, label: "1.15×", description: "Nhanh hơn một chút để luyện phản xạ." },
  {
    value: 1.25,
    label: "1.25×",
    description: "Thử thách: nghe nhanh để vào phòng thi thấy chậm.",
  },
] as const;

/** Seconds left of a FullTest attempt at the time the server answered (null without deadline). */
export function secondsLeft(deadline: string | null, serverNow: string): number | null {
  if (!deadline) return null;
  const end = Date.parse(deadline);
  const now = Date.parse(serverNow);
  if (Number.isNaN(end) || Number.isNaN(now)) return null;
  return Math.max(0, Math.floor((end - now) / 1000));
}

/* ---- Stats drawer ---- */

export interface RadarAxis {
  part: number;
  short: string;
  name: string;
  section: "listening" | "reading";
  answered: number;
  correct: number;
  /** Accuracy 0..100 (0 when nothing answered). */
  percent: number;
}

/** Seven axes P1..P7: accuracy per part from `me/practice/stats`. */
export function radarAxes(stats: Pick<PracticeStats, "byPart"> | null | undefined): RadarAxis[] {
  return PART_META.map((meta) => {
    const row = stats?.byPart.find((r) => r.part === meta.part);
    const answered = row?.answered ?? 0;
    const correct = Math.min(row?.correct ?? 0, answered);
    return {
      part: meta.part,
      short: `P${meta.part}`,
      name: meta.name,
      section: meta.section,
      answered,
      correct,
      percent: ratio(correct, answered),
    };
  });
}

/** Point of axis `index` of `count` at radius `r` (first axis straight up), rounded to 0.1. */
export function radarPoint(index: number, count: number, r: number, cx: number, cy: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const round = (v: number) => Math.round(v * 10) / 10;
  return [round(cx + r * Math.cos(angle)), round(cy + r * Math.sin(angle))] as const;
}

export interface WaffleCell {
  id: string;
  title: string;
  status: ProgressStatus;
  percent: number;
}

export interface WaffleRow {
  key: string;
  label: string;
  cells: WaffleCell[];
}

/** One row per series, one cell per test, coloured by its progress. */
export function waffleRows(
  series: readonly TestSeries[],
  progressById: ReadonlyMap<string, TestProgress>,
): WaffleRow[] {
  return series.map((s) => ({
    key: s.key,
    label: s.label,
    cells: s.tests.map((test) => {
      const progress = testProgressOf(progressById.get(test.id));
      return {
        id: test.id,
        title: `${s.label} · ${testLabel(test)}`,
        status: progress.status,
        percent: progress.percent,
      };
    }),
  }));
}

export function waffleCounts(rows: readonly WaffleRow[]) {
  const cells = rows.flatMap((row) => row.cells);
  return {
    done: cells.filter((c) => c.status === "done").length,
    doing: cells.filter((c) => c.status === "doing").length,
    todo: cells.filter((c) => c.status === "todo").length,
  };
}

/* ---- History ---- */

export type HistoryTab = "all" | "completed" | "in-progress" | "abandoned";
export type HistoryModeFilter = "all" | "FullTest" | "Practice";

export const HISTORY_TABS: readonly { value: HistoryTab; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "completed", label: "Đã nộp" },
  { value: "in-progress", label: "Đang làm" },
  { value: "abandoned", label: "Đã bỏ" },
];

/** Status sent to `GET attempts` for a tab ("all" pages the completed list). */
export const historyStatusOf = (tab: HistoryTab): AttemptStatus =>
  tab === "in-progress" ? "InProgress" : tab === "abandoned" ? "Abandoned" : "Completed";

export const parseHistoryTab = (value: string | null): HistoryTab =>
  HISTORY_TABS.some((t) => t.value === value) ? (value as HistoryTab) : "all";

export const parseHistoryMode = (value: string | null): HistoryModeFilter =>
  value === "FullTest" || value === "Practice" ? value : "all";

export const statusLabel = (status: AttemptStatus) =>
  status === "Completed" ? "Đã nộp" : status === "InProgress" ? "Đang làm" : "Đã bỏ";

/** Headline score of a history row: "785/990" when scaled, else "% đúng" of the questions. */
export function summaryScore(
  summary: Pick<
    AttemptSummary,
    "totalScaled" | "correct" | "questionCount" | "listeningScaled" | "readingScaled"
  >,
): { label: string; detail: string | null; kind: "scaled" | "percent" } {
  if (summary.totalScaled != null)
    return {
      label: `${summary.totalScaled}/990`,
      detail:
        summary.listeningScaled != null && summary.readingScaled != null
          ? `L ${summary.listeningScaled} · R ${summary.readingScaled}`
          : null,
      kind: "scaled",
    };
  if (summary.listeningScaled != null)
    return { label: `${summary.listeningScaled}/495`, detail: "Listening", kind: "scaled" };
  if (summary.readingScaled != null)
    return { label: `${summary.readingScaled}/495`, detail: "Reading", kind: "scaled" };
  return {
    label: `${ratio(summary.correct, summary.questionCount)}%`,
    detail: `${summary.correct}/${summary.questionCount} câu đúng`,
    kind: "percent",
  };
}

/** Where "Làm tiếp" of an in-progress attempt goes. */
export const continuePath = (summary: Pick<AttemptSummary, "id" | "mode" | "source">) =>
  summary.mode === "FullTest" && summary.source.kind === "Test"
    ? `/practice/tests/${summary.source.id}/exam`
    : `/practice/attempts/${summary.id}`;

/** Second line of a history row: series / part and level of the source. */
export function sourceLine(source: AttemptSource, parts: readonly number[]): string {
  const bits: string[] = [];
  if (source.kind === "Test") {
    if (source.category) bits.push(source.category);
    if (parts.length && parts.length < 7) bits.push(partsLabel(parts));
  } else {
    if (source.part) bits.push(`Part ${source.part}`);
    const level = levelTargetLabel(source.level, source.targetScore);
    if (level) bits.push(level);
  }
  return bits.join(" · ");
}

/** Section of a part list for colours: Listening parts are blue, Reading parts rose. */
export const toneOfPart = (part: number) => (isListeningPart(part) ? "blue" : "rose");
