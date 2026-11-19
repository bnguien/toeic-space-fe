import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { buildAttemptGroups } from "../src/modules/practice/utils/attemptGroups.ts";
import { buildExamSteps, stepKey } from "../src/modules/practice/utils/examSteps.ts";
import {
  activatesOnEnter,
  backTarget,
  clearPosition,
  derivedStep,
  optionFromKey,
  ownsKeys,
  positionKey,
  readPosition,
  remainingAtResponse,
  resumePosition,
  writePosition,
} from "../src/modules/practice/components/exam-room/examRoomState.ts";
import {
  buildResultRows,
  emptyMessage,
  filterCounts,
  filterRows,
  partScores,
  partsOf,
  resultBackLink,
  statusOf,
  sumParts,
} from "../src/modules/practice/components/result/resultRows.ts";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const question = (n, part, passageId = null) => ({
  id: uuid(0x100 + n),
  sourceQuestionId: uuid(0x400 + n),
  passageId,
  part,
  orderIndex: n,
  questionNumber: n,
  questionText: part <= 2 ? null : `Question ${n}`,
  optionA: "a",
  optionB: "b",
  optionC: "c",
  optionD: part === 2 ? null : "d",
  audioUrl: null,
  imageUrl: null,
  userAnswer: null,
  revision: 0,
  flagged: false,
  checked: false,
  timeSpentSeconds: 0,
});

const passage = (n, part) => ({
  id: uuid(0x900 + n),
  part,
  passageType: null,
  title: null,
  content: null,
  audioUrl: null,
  imageUrl: null,
  orderIndex: n,
});

/* P1 q1 · P2 q2 · P3 passage q3–q5 · P5 q6, q7 · P7 passage q8–q9 */
function fixture() {
  const p3 = passage(1, 3);
  const p7 = passage(2, 7);
  const questions = [
    question(1, 1),
    question(2, 2),
    question(3, 3, p3.id),
    question(4, 3, p3.id),
    question(5, 3, p3.id),
    question(6, 5),
    question(7, 5),
    question(8, 7, p7.id),
    question(9, 7, p7.id),
  ];
  const groups = buildAttemptGroups({
    questions,
    passages: [p3, p7],
    reveal: { questions: [], passages: [] },
  });
  return { questions, groups, steps: buildExamSteps(groups) };
}

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
};

test("exam room: position derived from saved answers", () => {
  const { questions, groups, steps } = fixture();
  // dir:intro dir:1 g0 dir:2 g1 dir:3 g2 dir:5 g3 g4 dir:7 g5
  assert.equal(steps.length, 12);
  const answered = (...ids) => {
    const set = new Set(ids.map((n) => questions[n - 1].id));
    return (id) => set.has(id);
  };
  assert.equal(derivedStep(steps, groups, answered()), 0);
  // Listening: the group after the last answered one (its audio was already played).
  assert.equal(derivedStep(steps, groups, answered(2)), 5);
  assert.equal(derivedStep(steps, groups, answered(1, 4)), 7);
  // Reading: the screen of the last answered question.
  assert.equal(derivedStep(steps, groups, answered(1, 7)), 9);
  assert.equal(derivedStep(steps, groups, answered(9)), 11);
});

test("exam room: resume takes the later of saved and derived, marks passed directions seen", () => {
  const { questions, groups, steps } = fixture();
  const none = () => false;
  const fromStored = resumePosition(steps, groups, none, { step: 6, seen: [], section: null });
  assert.equal(fromStored.step, 6);
  assert.deepEqual(fromStored.seen.sort(), ["dir:1", "dir:2", "dir:3", "dir:intro"]);
  assert.equal(fromStored.section, "listening");
  const ahead = resumePosition(steps, groups, (id) => id === questions[6].id, {
    step: 2,
    seen: ["dir:intro"],
  });
  assert.equal(ahead.step, 9, "answers beat an older saved screen");
  assert.equal(ahead.section, "reading");
  assert.ok(ahead.seen.includes(stepKey(steps[7])));
  const invalid = resumePosition(steps, groups, none, { step: 99, seen: [] });
  assert.equal(invalid.step, 0);
  const end = resumePosition(steps, groups, none, { step: 12, seen: [] });
  assert.equal(end.step, 12);
  assert.equal(end.section, null);
});

test("exam room: position storage is tolerant", () => {
  const storage = memoryStorage();
  const id = uuid(1);
  assert.equal(readPosition(id, storage), null);
  writePosition(id, { step: 4, seen: ["dir:intro"], section: "listening" }, storage);
  assert.equal(storage.map.has(positionKey(id)), true);
  assert.deepEqual(readPosition(id, storage), {
    step: 4,
    seen: ["dir:intro"],
    section: "listening",
  });
  storage.setItem(positionKey(id), "{broken");
  assert.equal(readPosition(id, storage), null);
  storage.setItem(positionKey(id), JSON.stringify({ step: -1 }));
  assert.equal(readPosition(id, storage), null);
  clearPosition(id, storage);
  assert.equal(storage.map.size, 0);
  assert.equal(readPosition(null, storage), null);
  const throwing = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
    removeItem: () => {},
  };
  assert.equal(readPosition(id, throwing), null);
  assert.doesNotThrow(() => writePosition(id, { step: 1, seen: [] }, throwing));
});

test("exam room: keys, timers and back target", () => {
  assert.equal(optionFromKey("1"), "A");
  assert.equal(optionFromKey("4"), "D");
  assert.equal(optionFromKey("C"), "C");
  assert.equal(optionFromKey("b"), "B");
  assert.equal(optionFromKey("5"), null);
  assert.equal(optionFromKey("Enter"), null);

  const { document } = new JSDOM(
    `<input id="radio" type="radio"><input id="range" type="range"><textarea id="ta"></textarea>
     <div contenteditable="true"><span id="ce">x</span></div><button id="btn"><b id="inner">x</b></button>
     <a id="link" href="/x">x</a><p id="p">x</p>`,
  ).window;
  const el = (id) => document.getElementById(id);
  assert.equal(ownsKeys(el("radio")), false, "radios do not own the exam keys");
  assert.equal(ownsKeys(el("range")), true);
  assert.equal(ownsKeys(el("ta")), true);
  assert.equal(ownsKeys(el("ce")), true);
  assert.equal(ownsKeys(el("p")), false);
  assert.equal(ownsKeys(null), false);
  assert.equal(activatesOnEnter(el("inner")), true);
  assert.equal(activatesOnEnter(el("link")), true);
  assert.equal(activatesOnEnter(el("radio")), false);

  assert.equal(remainingAtResponse("2026-11-18T10:00:00Z", "2026-11-18T09:58:30Z"), 90);
  assert.equal(remainingAtResponse("2026-11-18T10:00:00Z", "2026-11-18T10:05:00Z"), 0);
  assert.equal(remainingAtResponse(null, "2026-11-18T10:05:00Z"), null);

  assert.equal(backTarget(null), "/practice/exam");
  assert.equal(backTarget({ from: "/practice/exam?series=ETS" }), "/practice/exam?series=ETS");
  assert.equal(backTarget({ from: "/practice/tests/x/exam" }), "/practice/exam");
  assert.equal(backTarget({ from: "https://evil.example" }), "/practice/exam");
});

/* ---- Result page ---- */

const answer = (n, part, user, correct, extra = {}) => ({
  questionId: uuid(0x100 + n),
  sourceQuestionId: uuid(0x400 + n),
  questionNumber: n,
  part,
  orderIndex: n,
  userAnswer: user,
  correctAnswer: correct,
  isCorrect: user ? user === correct : null,
  flagged: false,
  ...extra,
});

test("result rows: statuses, numbering and the join with review groups", () => {
  assert.equal(statusOf(null, null), "skip");
  assert.equal(statusOf("A", true), "correct");
  assert.equal(statusOf("A", false), "wrong");
  assert.equal(statusOf("A", null), "wrong");

  const { groups } = fixture();
  const answers = [
    answer(8, 7, "B", "B", { flagged: true }),
    answer(1, 1, "A", "C"),
    answer(6, 5, null, "D"),
  ];
  const rows = buildResultRows(answers, groups);
  assert.deepEqual(
    rows.map((r) => [r.number, r.status, r.section, r.groupIndex, r.questionIndex]),
    [
      [1, "wrong", "listening", 0, 0],
      [6, "skip", "reading", 3, 0],
      [8, "correct", "reading", 5, 0],
    ],
  );
  assert.equal(rows[2].flagged, true);

  const bare = buildResultRows(answers, null);
  assert.deepEqual(
    bare.map((r) => [r.number, r.groupIndex]),
    [
      [1, -1],
      [6, -1],
      [8, -1],
    ],
  );
  // Practice sets mixing tests can repeat source numbers: 1..N in attempt order.
  const duplicated = buildResultRows(
    [answer(1, 5, "A", "A"), { ...answer(2, 5, "B", "A"), questionNumber: 1 }],
    null,
  );
  assert.deepEqual(
    duplicated.map((r) => r.number),
    [1, 2],
  );
});

test("result rows: filters, counts, part table and links", () => {
  const rows = buildResultRows(
    [
      answer(1, 1, "A", "A"),
      answer(2, 1, "B", "A"),
      answer(3, 2, null, "C"),
      answer(101, 5, "D", "D"),
      answer(102, 5, null, "B"),
    ],
    null,
  );
  assert.deepEqual(partsOf(rows), [1, 2, 5]);
  assert.deepEqual(filterCounts(rows, 0), { all: 5, wrong: 1, skip: 2 });
  assert.deepEqual(filterCounts(rows, 5), { all: 2, wrong: 0, skip: 1 });
  assert.deepEqual(
    filterRows(rows, 0, "skip").map((r) => r.number),
    [3, 102],
  );
  assert.deepEqual(
    filterRows(rows, 1, "wrong").map((r) => r.number),
    [2],
  );
  assert.deepEqual(filterRows(rows, 2, "wrong"), []);

  const computed = partScores([], rows);
  assert.deepEqual(computed, [
    { part: 1, total: 2, answered: 2, correct: 1 },
    { part: 2, total: 1, answered: 0, correct: 0 },
    { part: 5, total: 2, answered: 1, correct: 1 },
  ]);
  const server = [
    { part: 5, total: 30, answered: 30, correct: 20 },
    { part: 1, total: 6, answered: 6, correct: 5 },
  ];
  assert.deepEqual(
    partScores(server, rows).map((p) => p.part),
    [1, 5],
  );
  assert.deepEqual(sumParts(server), { correct: 25, total: 36 });

  assert.equal(emptyMessage("wrong"), "Không có câu sai nào ở đây — tuyệt vời!");
  assert.equal(emptyMessage("skip"), "Bạn không bỏ câu nào ở đây.");
  assert.equal(emptyMessage("all"), "Chưa có câu nào.");

  assert.deepEqual(resultBackLink({ kind: "Test", part: null }), {
    to: "/practice/exam",
    label: "Về Luyện đề",
  });
  assert.deepEqual(resultBackLink({ kind: "PracticeSet", part: 3 }), {
    to: "/practice/listening?part=3",
    label: "Về Luyện nghe",
  });
  assert.deepEqual(resultBackLink({ kind: "PracticeSet", part: 6 }), {
    to: "/practice/reading?part=6",
    label: "Về Luyện đọc",
  });
});
