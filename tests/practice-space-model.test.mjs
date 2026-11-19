import assert from "node:assert/strict";
import test from "node:test";

import {
  activeRelation,
  buildSeries,
  cardStateOf,
  cardTag,
  continuePath,
  historyStatusOf,
  parseHistoryTab,
  partNumberOf,
  pickNext,
  radarAxes,
  radarPoint,
  secondsLeft,
  setHeadline,
  setProgressOf,
  setsOfPart,
  sourceLine,
  summarizePool,
  summaryScore,
  testNumber,
  testProgressOf,
  waffleCounts,
  waffleRows,
} from "../src/modules/practice/components/space/spaceModel.ts";
import {
  abandonsActive,
  planOf,
  plannedCount,
  plannedLabel,
  startButtonLabel,
} from "../src/modules/practice/components/setup/setupModel.ts";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const testOf = (n, category, code = `${category}-TEST-${String(n).padStart(2, "0")}`) => ({
  id: uuid(n),
  code,
  title: `${category} - Test ${String(n).padStart(2, "0")}`,
  category,
  totalQuestions: 200,
  durationMinutes: 120,
});

test("series follow the category order, tests sorted by code, uncategorised last", () => {
  const tests = [
    testOf(2, "ETS 2026"),
    testOf(10, "ETS 2026"),
    testOf(1, "ETS 2026"),
    testOf(3, "Crack"),
    { ...testOf(4, "x"), category: null },
  ];
  const series = buildSeries(
    [{ category: "Crack" }, { category: "ETS 2026" }, { category: "Empty" }],
    tests,
  );
  assert.deepEqual(
    series.map((s) => s.key),
    ["Crack", "ETS 2026", "Đề khác"],
  );
  assert.deepEqual(
    series[1].tests.map((t) => testNumber(t)),
    ["01", "02", "10"],
  );
  assert.equal(testNumber({ code: "PASS-TOEIC", title: "Pass TOEIC (2026) - Test 6" }), "06");
});

test("test and set progress map to card states and the overview summary", () => {
  assert.deepEqual(testProgressOf(undefined), {
    status: "todo",
    percent: 0,
    best: null,
    activeMode: null,
  });
  const doing = testProgressOf({
    testId: uuid(1),
    status: "InProgress",
    activeAttemptId: uuid(9),
    activeMode: "FullTest",
    answeredCount: 50,
    totalQuestions: 200,
    completedCount: 1,
    bestTotalScaled: 600,
    lastCompletedAttemptId: uuid(8),
  });
  assert.equal(doing.status, "doing");
  assert.equal(doing.percent, 25);
  assert.equal(doing.best, 600);
  const done = testProgressOf({
    testId: uuid(2),
    status: "Completed",
    activeAttemptId: null,
    activeMode: null,
    answeredCount: 0,
    totalQuestions: 0,
    completedCount: 2,
    bestTotalScaled: null,
    lastCompletedAttemptId: uuid(7),
  });
  assert.equal(done.status, "done");

  const setRow = (answered, total, extra = {}) => ({
    practiceSetId: uuid(3),
    totalQuestions: total,
    answeredQuestions: answered,
    correctQuestions: 0,
    wrongQuestions: 0,
    activeAttemptId: null,
    ...extra,
  });
  assert.equal(setProgressOf(setRow(95, 95), 95).status, "done");
  assert.equal(setProgressOf(setRow(0, 95, { activeAttemptId: uuid(4) }), 95).status, "doing");
  assert.equal(setProgressOf(undefined, 40).total, 40);

  const items = [
    { status: "done", percent: 100 },
    { status: "todo", percent: 0 },
    { status: "doing", percent: 40 },
  ];
  assert.equal(
    pickNext(items, (x) => x),
    items[2],
  );
  assert.equal(
    pickNext([items[0], items[1]], (x) => x),
    items[1],
  );
  assert.equal(
    pickNext([items[0]], (x) => x),
    null,
  );
  assert.deepEqual(summarizePool(items), { total: 3, doing: 1, done: 1, percent: 47 });
  assert.equal(cardStateOf(items[0], true), "done");
  assert.equal(cardStateOf(items[2], true), "next");
  assert.equal(cardTag("next", 0, "200 câu"), "Bắt đầu");
  assert.equal(cardTag("next", 12, "200 câu"), "Làm tiếp");
  assert.equal(cardTag("todo", 0, "200 câu"), "200 câu");
});

test("practice sets are grouped per part in level order with readable headlines", () => {
  const set = (code, part, kind, level, extra = {}) => ({
    id: code,
    code,
    title: code,
    kind,
    part,
    level,
    targetScore: level ? [0, 450, 550, 650, 750, 850][level] : null,
    durationMinutes: 60,
    orderIndex: 0,
    questionCount: 100,
    ...extra,
  });
  const sets = [
    set("p5-t1", "Part5", "PartDrill", null),
    set("p5-lv2", "Part5", "Level", 2),
    set("p6-lv1", "Part6", "Level", 1),
    set("p5-lv1", "Part5", "Level", 1),
  ];
  assert.deepEqual(
    setsOfPart(sets, 5).map((s) => s.code),
    ["p5-lv1", "p5-lv2", "p5-t1"],
  );
  assert.equal(setHeadline(sets[3]), "Căn bản 450+");
  assert.equal(setHeadline(sets[0]), "100 câu thực chiến");
  assert.equal(partNumberOf("Part7"), 7);
  assert.equal(partNumberOf("Part9"), 0);
});

test("config dialog detects the in-progress attempt it would resume", () => {
  const active = { attemptId: uuid(1), mode: "Practice", parts: [5, 6] };
  assert.equal(activeRelation(null, "Practice", [1]), "none");
  assert.equal(activeRelation({ attemptId: null, mode: null, parts: [] }, "FullTest", []), "none");
  assert.equal(activeRelation(active, "Practice", [6, 5]), "same");
  assert.equal(activeRelation(active, "Practice", [5]), "conflict");
  assert.equal(activeRelation(active, "FullTest", [1, 2, 3, 4, 5, 6, 7]), "conflict");
  assert.equal(
    activeRelation({ ...active, mode: "FullTest" }, "FullTest", [1, 2, 3, 4, 5, 6, 7]),
    "same",
  );
  assert.equal(secondsLeft("2026-11-19T10:00:30Z", "2026-11-19T10:00:00Z"), 30);
  assert.equal(secondsLeft("2026-11-19T09:00:00Z", "2026-11-19T10:00:00Z"), 0);
  assert.equal(secondsLeft(null, "2026-11-19T10:00:00Z"), null);
});

test("stats drawer: radar accuracy per part and waffle per test", () => {
  const axes = radarAxes({ byPart: [{ part: 5, answered: 10, correct: 7 }] });
  assert.equal(axes.length, 7);
  assert.equal(axes[4].percent, 70);
  assert.equal(axes[4].section, "reading");
  assert.equal(axes[0].percent, 0);
  assert.deepEqual(radarPoint(0, 7, 100, 160, 146), [160, 46]);
  const series = buildSeries([{ category: "A" }], [testOf(1, "A"), testOf(2, "A")]);
  const rows = waffleRows(
    series,
    new Map([
      [
        uuid(1),
        {
          testId: uuid(1),
          status: "Completed",
          activeAttemptId: null,
          activeMode: null,
          answeredCount: 0,
          totalQuestions: 0,
          completedCount: 1,
          bestTotalScaled: null,
          lastCompletedAttemptId: null,
        },
      ],
    ]),
  );
  assert.deepEqual(waffleCounts(rows), { done: 1, doing: 0, todo: 1 });
});

test("history helpers: status per tab, score headline, continue path, source line", () => {
  assert.equal(parseHistoryTab("nope"), "all");
  assert.equal(historyStatusOf("all"), "Completed");
  assert.equal(historyStatusOf("in-progress"), "InProgress");
  assert.deepEqual(
    summaryScore({
      totalScaled: 785,
      listeningScaled: 400,
      readingScaled: 385,
      correct: 0,
      questionCount: 200,
    }),
    { label: "785/990", detail: "L 400 · R 385", kind: "scaled" },
  );
  assert.equal(
    summaryScore({
      totalScaled: null,
      listeningScaled: null,
      readingScaled: null,
      correct: 9,
      questionCount: 12,
    }).label,
    "75%",
  );
  const source = {
    kind: "Test",
    id: uuid(5),
    code: "",
    title: "",
    category: "ETS 2026",
    part: null,
    level: null,
    targetScore: null,
  };
  assert.equal(
    continuePath({ id: uuid(6), mode: "FullTest", source }),
    `/practice/tests/${uuid(5)}/exam`,
  );
  assert.equal(
    continuePath({ id: uuid(6), mode: "Practice", source }),
    `/practice/attempts/${uuid(6)}`,
  );
  assert.equal(sourceLine(source, [5, 6]), "ETS 2026 · Part 5, 6");
  assert.equal(
    sourceLine({ ...source, kind: "PracticeSet", part: 3, level: 2, targetScore: 550 }, []),
    "Part 3 · Sơ cấp 550+",
  );
});

test("setup choices plan the right start request", () => {
  const counts = (answered, wrong, total = 20) => ({
    total,
    answered,
    unanswered: total - answered,
    correct: answered - wrong,
    wrong,
    percent: Math.round((answered / total) * 100),
  });
  const base = { counts: counts(5, 2), active: null, completed: [], grouped: false };
  assert.deepEqual(planOf("continue", base), {
    kind: "start",
    selection: "Continue",
    restart: false,
  });
  assert.equal(startButtonLabel(planOf("continue", base), base), "Học tiếp");
  assert.equal(plannedCount("continue", base), 15);

  const finished = { ...base, counts: counts(20, 0) };
  assert.deepEqual(planOf("continue", finished), {
    kind: "start",
    selection: "All",
    restart: false,
  });
  assert.equal(startButtonLabel(planOf("continue", finished), finished), "Làm lại cả bộ");
  assert.equal(planOf("mistakes", finished), null);

  const active = { id: uuid(1), title: "Part 5 · Học tiếp", answered: 3, questionCount: 10 };
  const withActive = { ...base, active, completed: [{ id: uuid(2), questionCount: 12 }] };
  assert.deepEqual(planOf("continue", withActive), { kind: "resume", attemptId: uuid(1) });
  assert.equal(plannedCount("continue", withActive), 10);
  const fresh = planOf("continue", withActive, { continueMode: "fresh" });
  assert.deepEqual(fresh, { kind: "start", selection: "Continue", restart: true });
  assert.ok(abandonsActive(fresh, withActive));
  assert.deepEqual(planOf("mistakes", withActive), {
    kind: "start",
    selection: "Mistakes",
    restart: true,
  });
  assert.equal(plannedCount("mistakes", withActive), 2);
  assert.deepEqual(planOf("random", withActive, { count: 10 }), {
    kind: "start",
    selection: "Random",
    count: 10,
    restart: true,
  });
  assert.equal(
    startButtonLabel(planOf("random", withActive, { count: 10 }), withActive, 10),
    "Tạo bài 10 câu và bắt đầu",
  );
  assert.deepEqual(planOf("review", withActive), { kind: "review", attemptId: uuid(2) });
  assert.equal(plannedCount("review", withActive), 12);
  assert.equal(planOf("review", base), null);
  assert.equal(plannedLabel(20, true), "khoảng 20 câu");
  assert.equal(plannedLabel(0, false), "Chưa có câu phù hợp");
});
