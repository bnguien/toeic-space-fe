import assert from "node:assert/strict";
import test from "node:test";

import { attemptSchema, partSchema } from "../src/modules/practice/schemas/attempt.schema.ts";
import {
  buildAttemptGroups,
  cleanOption,
  displayNumbers,
  generatedGroupTitle,
  groupLabel,
  mergeReveal,
  splitTranslation,
} from "../src/modules/practice/utils/attemptGroups.ts";
import {
  answerWindowSeconds,
  buildExamSteps,
  isGroupLocked,
  nextStepIndex,
  previousReadingStepIndex,
  stepKey,
  stepLabel,
  stepQuestions,
} from "../src/modules/practice/utils/examSteps.ts";
import { directionsAudio } from "../src/modules/practice/utils/directions.ts";
import { localDeadline } from "../src/modules/practice/utils/examClock.ts";
import {
  levelTargetLabel,
  partFromNumber,
  partMeta,
  partsSummary,
  PART_META,
} from "../src/modules/practice/utils/parts.ts";
import {
  barLevel,
  cefrFallback,
  cefrOf,
  formatClock,
  scoreComment,
  scoreCounts,
  scoreHeadline,
} from "../src/modules/practice/utils/scoreDisplay.ts";
import {
  normalizeDragRatio,
  splitBadge,
  stepLeftRatio,
  stepRightRatio,
} from "../src/modules/practice/utils/splitRatio.ts";
import {
  clampRandomCount,
  continueDescription,
  countSetQuestions,
  defaultRandomCount,
  filterSetQuestions,
  selectionOf,
  startLabel,
} from "../src/modules/practice/utils/practiceSelection.ts";
import { practiceExamError } from "../src/modules/practice/utils/practiceExamErrors.ts";

/* ---- Fixtures ---- */

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

function question(part, number, extra = {}) {
  return {
    id: uuid(),
    sourceQuestionId: uuid(),
    passageId: null,
    part,
    orderIndex: number,
    questionNumber: number,
    questionText: part <= 2 ? null : `${number}. Question ${number}?`,
    optionA: "(A) Alpha",
    optionB: "B. Beta",
    optionC: "Gamma",
    optionD: part === 2 ? null : "Delta",
    audioUrl: null,
    imageUrl: null,
    userAnswer: null,
    revision: 0,
    flagged: false,
    checked: false,
    timeSpentSeconds: 0,
    ...extra,
  };
}

function passage(part, extra = {}) {
  return {
    id: uuid(),
    part,
    passageType: null,
    title: null,
    content: null,
    audioUrl: null,
    imageUrl: null,
    orderIndex: 0,
    ...extra,
  };
}

/** Small full-test shaped attempt: P1×2, P2×1, P3 group×3, P5×2, P6 group×2, P7 group×2. */
function sampleAttempt() {
  const p3 = passage(3, {
    audioUrl: "https://cdn.example/p3.mp3",
    imageUrl: "a.png<image_split>b.png",
  });
  const p6 = passage(6, { content: "Dear ____131____ team<translation_split>Kính gửi" });
  const p7 = passage(7, { title: "E-mail" });
  const questions = [
    question(1, 1, { audioUrl: "https://cdn.example/q1.mp3", imageUrl: "q1.png" }),
    question(1, 2),
    question(2, 7),
    question(3, 32, { passageId: p3.id }),
    question(3, 33, { passageId: p3.id }),
    question(3, 34, { passageId: p3.id }),
    question(5, 101),
    question(5, 102),
    question(6, 131, { passageId: p6.id }),
    question(6, 132, { passageId: p6.id }),
    question(7, 147, { passageId: p7.id }),
    question(7, 148, { passageId: p7.id }),
  ];
  return {
    questions,
    passages: [p3, p6, p7],
    reveal: { questions: [], passages: [] },
    p3,
    p6,
    p7,
  };
}

/* ---- Schemas ---- */

test("part schema accepts numbers, numeric strings and enum names", () => {
  assert.equal(partSchema.parse(3), 3);
  assert.equal(partSchema.parse("5"), 5);
  assert.equal(partSchema.parse("Part7"), 7);
  assert.throws(() => partSchema.parse("Part9"));
});

test("attempt schema parses the AttemptDto with defaults for optional fields", () => {
  const { questions, passages } = sampleAttempt();
  const parsed = attemptSchema.parse({
    id: uuid(),
    mode: "FullTest",
    status: "InProgress",
    title: "ETS 2026 · Test 1",
    source: { kind: "Test", id: uuid(), code: "ETS-1", title: "Test 1" },
    testId: uuid(),
    practiceSetId: null,
    parts: ["Part1", 2, "3"],
    startTime: "2026-11-18T10:00:00Z",
    lastActivityAt: "2026-11-18T10:00:00Z",
    expiresAt: "2026-11-25T10:00:00Z",
    deadline: "2026-11-18T12:00:00Z",
    timeLimitSeconds: 7200,
    serverNow: "2026-11-18T10:00:05Z",
    questions: questions.map((q) => ({ ...q, part: `Part${q.part}` })),
    passages,
  });
  assert.deepEqual(parsed.parts, [1, 2, 3]);
  assert.deepEqual(parsed.reveal, { questions: [], passages: [] });
  assert.equal(parsed.source.category, null);
  assert.equal(parsed.questions[0].part, 1);
  assert.equal(parsed.mode, "FullTest");
  // Unknown future modes degrade instead of failing the page.
  assert.equal(attemptSchema.shape.mode.parse("Marathon"), "Practice");
});

/* ---- Grouping ---- */

test("groups follow order, keep passages whole and generate titles", () => {
  const attempt = sampleAttempt();
  const groups = buildAttemptGroups(attempt);
  assert.deepEqual(
    groups.map((g) => [g.part, g.questions.length]),
    [
      [1, 1],
      [1, 1],
      [2, 1],
      [3, 3],
      [5, 1],
      [5, 1],
      [6, 2],
      [7, 2],
    ],
  );
  const p3 = groups[3];
  assert.equal(p3.id, `p_${attempt.p3.id}`);
  assert.equal(p3.title, "Questions 32-34 refer to the following conversation.");
  assert.equal(p3.audioUrl, "https://cdn.example/p3.mp3");
  assert.deepEqual(p3.imageUrls, ["a.png", "b.png"]);
  assert.equal(p3.section, "listening");
  assert.equal(groups[6].title, "Questions 131-132 refer to the following text.");
  assert.equal(groups[6].content, "Dear ____131____ team"); // translation never shown in progress
  assert.equal(groups[6].translation, null);
  assert.equal(groups[7].title, "E-mail");
  assert.equal(groups[0].audioUrl, "https://cdn.example/q1.mp3");
  assert.deepEqual(groups[0].imageUrls, ["q1.png"]);
  // Options: prefixes stripped, Part 2 has A–C only.
  assert.deepEqual(
    groups[0].questions[0].options.map((o) => o.text),
    ["Alpha", "Beta", "Gamma", "Delta"],
  );
  assert.deepEqual(
    groups[2].questions[0].options.map((o) => o.key),
    ["A", "B", "C"],
  );
  assert.equal(groups[4].questions[0].text, "Question 101?");
  assert.equal(groups[0].questions[0].text, "");
  assert.equal(groupLabel(groups[3]), "Nhóm câu 32-34 (3 câu hỏi)");
  assert.equal(groupLabel(groups[4]), "Câu 101");
});

test("an interleaved passage (A–B–A) keeps three groups in order", () => {
  const a = passage(7);
  const b = passage(7);
  const qs = [
    question(7, 1, { passageId: a.id, orderIndex: 0 }),
    question(7, 2, { passageId: b.id, orderIndex: 1 }),
    question(7, 3, { passageId: a.id, orderIndex: 2 }),
  ];
  const groups = buildAttemptGroups({
    questions: qs,
    passages: [a, b],
    reveal: { questions: [], passages: [] },
  });
  assert.deepEqual(
    groups.map((g) => g.passageId),
    [a.id, b.id, a.id],
  );
});

test("duplicate or missing source numbers renumber 1..N in attempt order", () => {
  const qs = [
    question(5, 101, { orderIndex: 1 }),
    question(5, 101, { orderIndex: 0 }),
    question(5, 140, { orderIndex: 2 }),
  ];
  const numbers = displayNumbers(qs);
  assert.deepEqual(
    qs.map((q) => numbers.get(q.id)),
    [2, 1, 3],
  );
  const unique = [question(5, 105, { orderIndex: 0 }), question(5, 110, { orderIndex: 1 })];
  assert.deepEqual([...displayNumbers(unique).values()], [105, 110]);
  const missing = [question(5, 105, { orderIndex: 0 }), question(5, null, { orderIndex: 1 })];
  assert.deepEqual([...displayNumbers(missing).values()], [1, 2]);
});

test("reveal merges answers and passage translation without touching other groups", () => {
  const attempt = sampleAttempt();
  const groups = buildAttemptGroups(attempt);
  const target = groups[6].questions[0];
  const merged = mergeReveal(groups, {
    questions: [
      {
        questionId: target.id,
        correctAnswer: "B",
        userAnswer: "C",
        isCorrect: false,
        explanation: "<p>Because</p>",
        transcript: null,
        history: [],
      },
    ],
    passages: [
      { id: attempt.p6.id, content: "Dear ____131____ team", translation: "Kính gửi nhóm" },
    ],
  });
  assert.equal(merged[0], groups[0]);
  assert.notEqual(merged[6], groups[6]);
  assert.equal(merged[6].questions[0].reveal.correctAnswer, "B");
  assert.equal(merged[6].questions[1].reveal, null);
  assert.equal(merged[6].translation, "Kính gửi nhóm");
});

test("small helpers", () => {
  assert.equal(cleanOption("(C) Gamma", "C"), "Gamma");
  assert.equal(cleanOption("D. Delta", "D"), "Delta");
  assert.deepEqual(splitTranslation("EN<translation_split>VI"), ["EN", "VI"]);
  assert.equal(generatedGroupTitle(4, 71, 71), "Question 71 refers to the following talk.");
});

/* ---- Exam steps & locks ---- */

test("exam steps: intro + directions per part, Part 5 one per screen", () => {
  const groups = buildAttemptGroups(sampleAttempt());
  const steps = buildExamSteps(groups);
  assert.deepEqual(
    steps.map((s) => (s.type === "directions" ? `dir:${s.key}` : `g${s.groupIndex}`)),
    [
      "dir:intro",
      "dir:1",
      "g0",
      "g1",
      "dir:2",
      "g2",
      "dir:3",
      "g3",
      "dir:5",
      "g4",
      "g5",
      "dir:6",
      "g6",
      "dir:7",
      "g7",
    ],
  );
  assert.equal(stepLabel(steps, 0), "Listening · Directions");
  assert.equal(stepLabel(steps, 7), "Listening · Part 3");
  assert.equal(stepLabel(steps, steps.length), "Kết thúc");
  assert.equal(stepQuestions(groups, steps[7]).length, 3);
});

test("a Part 5 group with several questions is split into one screen per question", () => {
  const p = passage(5);
  const groups = buildAttemptGroups({
    questions: [question(5, 101, { passageId: p.id }), question(5, 102, { passageId: p.id })],
    passages: [p],
    reveal: { questions: [], passages: [] },
  });
  const steps = buildExamSteps(groups);
  assert.deepEqual(
    steps.map((s) => (s.type === "group" ? s.questionIndex : s.key)),
    [5, 0, 1],
  );
  assert.equal(stepQuestions(groups, steps[2])[0].number, 102);
});

test("lock rules: listening only the playing group; reading locked during listening", () => {
  const groups = buildAttemptGroups(sampleAttempt());
  const steps = buildExamSteps(groups);
  const playingP3 = 7; // g3
  assert.equal(isGroupLocked(groups, steps, playingP3, 3), false);
  assert.equal(isGroupLocked(groups, steps, playingP3, 0), true);
  assert.equal(isGroupLocked(groups, steps, playingP3, 4), true);
  const readingStep = steps.findIndex((s) => s.type === "group" && s.groupIndex === 5);
  assert.equal(isGroupLocked(groups, steps, readingStep, 7), false);
  assert.equal(isGroupLocked(groups, steps, readingStep, 3), true);
  assert.equal(isGroupLocked(groups, steps, steps.length, 6), false); // finished: reading free
});

test("navigation skips seen directions; back stays within Reading groups", () => {
  const groups = buildAttemptGroups(sampleAttempt());
  const steps = buildExamSteps(groups);
  const g5 = steps.findIndex((s) => s.type === "group" && s.groupIndex === 5);
  assert.equal(steps[nextStepIndex(steps, g5)].type, "directions");
  const seen = new Set([stepKey(steps[g5 + 1])]);
  assert.equal(nextStepIndex(steps, g5, seen), g5 + 2);
  assert.equal(nextStepIndex(steps, steps.length - 1), -1);
  const g6 = steps.findIndex((s) => s.type === "group" && s.groupIndex === 6);
  assert.equal(previousReadingStepIndex(steps, g6), g5);
  const g4 = steps.findIndex((s) => s.type === "group" && s.groupIndex === 4);
  assert.equal(previousReadingStepIndex(steps, g4), -1);
});

test("answer window: P1/P2 5 s, P3/P4 8 s per question", () => {
  assert.equal(answerWindowSeconds({ part: 1, questions: [1] }), 5);
  assert.equal(answerWindowSeconds({ part: 2, questions: [1] }), 5);
  assert.equal(answerWindowSeconds({ part: 3, questions: [1, 2, 3] }), 24);
  assert.equal(answerWindowSeconds({ part: 4, questions: [] }), 8);
});

test("directions audio exists for intro and Parts 1–4 only", () => {
  assert.equal(directionsAudio("intro"), "/assets/exam/directions/intro.mp3");
  assert.equal(directionsAudio(4), "/assets/exam/directions/part4.mp3");
  assert.equal(directionsAudio(5), null);
});

test("exam clock corrects the device/server offset", () => {
  const now = Date.parse("2026-11-18T10:00:00Z");
  // Server is 30 s ahead: 10 minutes left on the server = 10 minutes left locally.
  const end = localDeadline("2026-11-18T10:10:30Z", "2026-11-18T10:00:30Z", now);
  assert.equal(end - now, 10 * 60_000);
  assert.equal(localDeadline("nope", null, now), null);
});

/* ---- Parts & levels ---- */

test("part metadata table", () => {
  assert.deepEqual(
    PART_META.map((m) => m.count),
    [6, 25, 39, 30, 30, 16, 54],
  );
  assert.deepEqual(
    PART_META.map((m) => m.minutes),
    [3, 9, 17, 16, 15, 10, 50],
  );
  assert.equal(partMeta(3).tone, "blue");
  assert.equal(partMeta(6).tone, "rose");
  assert.equal(partFromNumber(147), 7);
  assert.equal(partFromNumber(31), 2);
  assert.deepEqual(partsSummary([1, 2, 3, 4]), { partCount: 4, questions: 100, minutes: 45 });
  assert.equal(levelTargetLabel(1), "Căn bản 450+");
  assert.equal(levelTargetLabel(5), "Chuyên sâu 850+");
  assert.equal(levelTargetLabel(null, 700), "700+");
  assert.equal(levelTargetLabel(null), null);
});

/* ---- Score display ---- */

test("CEFR fallback uses the server thresholds", () => {
  assert.equal(cefrFallback(905).level, "C2");
  assert.equal(cefrFallback(904).level, "C1");
  assert.equal(cefrFallback(785).level, "C1");
  assert.equal(cefrFallback(605).level, "B2");
  assert.equal(cefrFallback(405).title, "Trung cấp cơ bản");
  assert.equal(cefrFallback(255).level, "A2");
  assert.equal(cefrFallback(10).level, "A1");
  assert.deepEqual(cefrOf({ totalScaled: 500, cefr: { level: "B1", title: "Server" } }), {
    level: "B1",
    title: "Server",
  });
  assert.equal(cefrOf({ totalScaled: null, cefr: null }), null);
});

test("comment bands, mini bar levels and clocks", () => {
  assert.match(scoreComment(785), /^Xuất sắc/);
  assert.match(scoreComment(784), /^Rất tốt/);
  assert.match(scoreComment(405), /^Khá tốt/);
  assert.match(scoreComment(404), /^Cố lên/);
  assert.equal(barLevel(70), "good");
  assert.equal(barLevel(69), "mid");
  assert.equal(barLevel(45), "mid");
  assert.equal(barLevel(44), "low");
  assert.equal(formatClock(65), "01:05");
  assert.equal(formatClock(3725), "1:02:05");
  assert.equal(formatClock(-4), "00:00");
});

test("score headline: scaled /990 or percentage", () => {
  const base = {
    questionCount: 20,
    answered: 18,
    correct: 15,
    listeningCorrect: 0,
    listeningTotal: 0,
    readingCorrect: 15,
    readingTotal: 20,
    listeningScaled: null,
    readingScaled: null,
    totalScaled: null,
    cefr: null,
  };
  assert.deepEqual(scoreHeadline(base), { kind: "percent", value: 75, max: 100, label: "75%" });
  assert.equal(scoreHeadline({ ...base, totalScaled: 650 }).label, "650/990");
  assert.deepEqual(scoreCounts(base), { correct: 15, wrong: 3, skipped: 2, correctPercent: 75 });
});

/* ---- Split pane ---- */

test("split ratio clamps, snaps and steps", () => {
  assert.equal(normalizeDragRatio(10), 20);
  assert.equal(normalizeDragRatio(95), 80);
  assert.equal(normalizeDragRatio(49), 50);
  assert.equal(normalizeDragRatio(51.5), 50);
  assert.equal(normalizeDragRatio(52), 52);
  assert.equal(stepLeftRatio(50), 35);
  assert.equal(stepLeftRatio(35), 0);
  assert.equal(stepLeftRatio(100), 50);
  assert.equal(stepRightRatio(50), 65);
  assert.equal(stepRightRatio(65), 100);
  assert.equal(stepRightRatio(0), 50);
  assert.equal(splitBadge(62), "62% : 38%");
});

/* ---- Practice setup selection ---- */

test("selection helpers", () => {
  const rows = [
    {
      sourceQuestionId: uuid(),
      orderIndex: 2,
      questionNumber: 3,
      part: 5,
      status: "Wrong",
      lastAnsweredAt: null,
    },
    {
      sourceQuestionId: uuid(),
      orderIndex: 0,
      questionNumber: 1,
      part: 5,
      status: "Correct",
      lastAnsweredAt: null,
    },
    {
      sourceQuestionId: uuid(),
      orderIndex: 1,
      questionNumber: 2,
      part: 5,
      status: "Unanswered",
      lastAnsweredAt: null,
    },
  ];
  const counts = countSetQuestions(rows);
  assert.deepEqual(counts, {
    total: 3,
    answered: 2,
    unanswered: 1,
    correct: 1,
    wrong: 1,
    percent: 67,
  });
  assert.deepEqual(
    filterSetQuestions(rows, "all").map((r) => r.orderIndex),
    [0, 1, 2],
  );
  assert.equal(filterSetQuestions(rows, "unanswered").length, 1);
  assert.equal(clampRandomCount(2, 100), 5);
  assert.equal(clampRandomCount(500, 100), 100);
  assert.equal(clampRandomCount(500, 1000), 200);
  assert.equal(defaultRandomCount(12), 12);
  assert.equal(defaultRandomCount(300), 20);
  assert.equal(selectionOf("random"), "Random");
  assert.equal(selectionOf("review"), null);
  assert.equal(startLabel("random", { count: 40 }), "Tạo bài 40 câu và bắt đầu");
  assert.equal(startLabel("continue", { hasActive: true }), "Làm tiếp bài đang dở");
  assert.match(continueDescription(counts), /Đã làm 2\/3 câu/);
});

test("error messages map server codes", () => {
  const error = (status, code) => ({ response: { status, data: { code } } });
  assert.match(practiceExamError(error(409, "answer_locked")), /đã được chấm/);
  assert.match(practiceExamError(error(409, "nothing_to_practice")), /Không còn câu/);
  assert.match(practiceExamError(error(404)), /Không tìm thấy/);
  assert.equal(practiceExamError(new Error("x"), "fallback"), "fallback");
});
