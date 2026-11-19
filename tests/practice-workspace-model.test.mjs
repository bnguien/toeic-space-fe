import assert from "node:assert/strict";
import test from "node:test";

import {
  checkLabel,
  exitPath,
  findQuestion,
  gridButtonLabel,
  initialGroupIndex,
  isBlankPointer,
  numberByPosition,
  partJumps,
  primaryAction,
  progressLabel,
  readNavState,
  resultCellTitle,
  resultCells,
  resultLine,
  revealedOptions,
  setupPath,
  stripSpeakerTags,
  unansweredQuestions,
} from "../src/modules/practice/components/workspace/workspaceModel.ts";

const options = (texts) =>
  ["A", "B", "C", "D"].slice(0, texts.length).map((key, i) => ({ key, text: texts[i] }));

const q = (id, number, part = 5, extra = {}) => ({
  id,
  sourceQuestionId: `src-${id}`,
  passageId: null,
  part,
  orderIndex: number,
  number,
  sourceNumber: number,
  text: "",
  options: options(["one", "two", "three", "four"]),
  audioUrl: null,
  imageUrls: [],
  reveal: null,
  ...extra,
});

const group = (id, part, questions) => ({
  id,
  passageId: null,
  isPassage: questions.length > 1,
  part,
  section: part <= 4 ? "listening" : "reading",
  title: "",
  passageType: null,
  content: null,
  translation: null,
  audioUrl: null,
  imageUrls: [],
  questions,
  firstNumber: Math.min(...questions.map((x) => x.number)),
  lastNumber: Math.max(...questions.map((x) => x.number)),
});

const reveal = (correctAnswer, userAnswer, extra = {}) => ({
  correctAnswer,
  userAnswer,
  isCorrect: userAnswer ? userAnswer === correctAnswer : null,
  explanation: null,
  transcript: null,
  transcriptTranslation: null,
  history: [],
  ...extra,
});

test("navigation state is read defensively", () => {
  assert.deepEqual(readNavState(null), { from: null, speed: 1, part1Game: null });
  assert.deepEqual(
    readNavState({ from: "/practice/listening?part=1", speed: 1.25, part1Game: "keyword" }),
    { from: "/practice/listening?part=1", speed: 1.25, part1Game: "keyword" },
  );
  assert.deepEqual(readNavState({ from: "//evil.example", speed: 9, part1Game: "dictation" }), {
    from: null,
    speed: 1,
    part1Game: null,
  });
});

test("exit and setup targets follow the source", () => {
  assert.equal(exitPath({ kind: "Test", part: null }, null), "/practice/exam");
  assert.equal(exitPath({ kind: "PracticeSet", part: 3 }, null), "/practice/listening?part=3");
  assert.equal(exitPath({ kind: "PracticeSet", part: 6 }, null), "/practice/reading?part=6");
  assert.equal(exitPath({ kind: "Test", part: null }, "/practice/history"), "/practice/history");
  assert.equal(setupPath({ kind: "PracticeSet", id: "s1" }), "/practice/parts/s1");
  assert.equal(setupPath({ kind: "Test", id: "t1" }), null);
});

test("progress labels: full runs, parts of a test and scattered retakes", () => {
  const full = [group("g1", 1, [q("a", 1, 1)]), group("g2", 3, [q("b", 2, 3), q("c", 3, 3)])];
  assert.equal(progressLabel(full, 0), "Câu 1 / 3");
  assert.equal(progressLabel(full, 1), "Nhóm câu 2-3 / 3");
  const reading = [group("g1", 5, [q("a", 101)]), group("g2", 6, [q("b", 102), q("c", 103)])];
  assert.equal(progressLabel(reading, 0), "Câu 101 · 1/3");
  assert.equal(progressLabel(reading, 1), "Nhóm câu 102-103 · 2-3/3");
  const retake = [group("g1", 1, [q("a", 5, 1)]), group("g2", 5, [q("b", 101)])];
  assert.equal(progressLabel(retake, 1), "Câu 2 / 2");
  assert.equal(gridButtonLabel(reading, 1), "102-103/3");
  assert.equal(checkLabel(reading[0]), "Kiểm tra đáp án câu 101");
  assert.equal(checkLabel(reading[1]), "Kiểm tra nhóm câu 102–103");
});

test("practice sets are numbered by position", () => {
  const groups = numberByPosition([
    group("g1", 5, [q("a", 117)]),
    group("g2", 6, [q("b", 131), q("c", 132)]),
  ]);
  assert.deepEqual(
    groups.flatMap((g) => g.questions.map((x) => x.number)),
    [1, 2, 3],
  );
  assert.equal(groups[1].firstNumber, 2);
  assert.equal(groups[1].questions[0].sourceNumber, 131, "Part 6 blanks keep source numbers");
});

test("opening position, deep links, part jumps and unanswered questions", () => {
  const groups = [
    group("g1", 1, [q("a", 1, 1, { reveal: reveal("A", "A") })]),
    group("g2", 2, [q("b", 2, 2)]),
    group("g3", 5, [q("c", 3)]),
  ];
  const answers = { a: "A", b: "C", c: null };
  const answerOf = (id) => answers[id] ?? null;
  assert.equal(initialGroupIndex(groups, answerOf), 2);
  assert.equal(
    initialGroupIndex(groups, () => "A"),
    0,
    "everything answered: start at 0",
  );
  assert.deepEqual(findQuestion(groups, "SRC-B"), { groupIndex: 1, questionId: "b" });
  assert.deepEqual(findQuestion(groups, "c"), { groupIndex: 2, questionId: "c" });
  assert.equal(findQuestion(groups, "missing"), null);
  assert.deepEqual(partJumps(groups), [
    { part: 1, groupIndex: 0, count: 1 },
    { part: 2, groupIndex: 1, count: 1 },
    { part: 5, groupIndex: 2, count: 1 },
  ]);
  assert.deepEqual(
    unansweredQuestions(groups, answerOf).map((x) => x.id),
    ["c"],
  );
});

test("phone primary button: check, then submit on the last group, else next", () => {
  const base = { canCheck: true, answeredInGroup: 1, canSubmit: true, isLast: false };
  assert.equal(primaryAction(base), "check");
  assert.equal(primaryAction({ ...base, answeredInGroup: 0 }), "next");
  assert.equal(primaryAction({ ...base, canCheck: false, isLast: true }), "submit");
  assert.equal(primaryAction({ ...base, canCheck: false, canSubmit: false, isLast: true }), "next");
});

test("question card helpers: result lines, P1/P2 statements and translations", () => {
  assert.deepEqual(resultLine(q("a", 1, 5, { reveal: reveal("B", "B") })), {
    tone: "correct",
    text: "Chính xác! Đáp án đúng: (B)",
  });
  assert.deepEqual(resultLine(q("a", 1, 5, { reveal: reveal("B", null) })), {
    tone: "wrong",
    text: "Sai rồi! Bạn chọn (—), đáp án đúng: (B)",
  });
  const p1 = q("p1", 1, 1, {
    options: options(["", "", "", ""]),
    reveal: reveal("A", "C", {
      transcript: "(A) He is reading. (B) He is eating. (C) He is running. (D) He is sleeping.",
      transcriptTranslation: "(A) Anh ấy đang đọc. (B) Anh ấy đang ăn.",
    }),
  });
  const shown = revealedOptions(p1);
  assert.deepEqual(
    shown.map((o) => [o.key, o.text, o.vi]),
    [
      ["A", "He is reading.", "Anh ấy đang đọc."],
      ["B", "He is eating.", "Anh ấy đang ăn."],
      ["C", "He is running.", ""],
      ["D", "He is sleeping.", ""],
    ],
  );
  assert.deepEqual(
    revealedOptions(q("p5", 1, 5)).map((o) => o.text),
    ["one", "two", "three", "four"],
  );
  assert.equal(revealedOptions(q("p1x", 1, 1))[0].text, "one", "unrevealed: untouched");
  assert.equal(stripSpeakerTags("W-Am: Where is it? M-Au Next door."), "Where is it? Next door.");
  assert.ok(isBlankPointer(""));
  assert.ok(isBlankPointer("Questions 131-134 refer to the following e-mail."));
  assert.ok(!isBlankPointer("What is the purpose of the e-mail?"));
});

test("score overlay cells follow the workspace numbering", () => {
  const groups = numberByPosition([group("g1", 5, [q("a", 117)]), group("g2", 5, [q("b", 120)])]);
  const answer = (questionId, orderIndex, userAnswer, isCorrect, flagged = false) => ({
    questionId,
    sourceQuestionId: `src-${questionId}`,
    questionNumber: 100 + orderIndex,
    part: 5,
    orderIndex,
    userAnswer,
    correctAnswer: "C",
    isCorrect,
    flagged,
  });
  const cells = resultCells(
    { answers: [answer("b", 1, null, null, true), answer("a", 0, "B", false)] },
    groups,
  );
  assert.deepEqual(
    cells.map((c) => [c.questionId, c.number, c.groupIndex, c.status, c.flagged]),
    [
      ["a", 1, 0, "wrong", false],
      ["b", 2, 1, "skipped", true],
    ],
  );
  assert.equal(resultCellTitle(cells[0]), "Câu 1: Sai (bạn chọn B, đáp án C)");
  assert.equal(resultCellTitle(cells[1]), "Câu 2: Chưa làm · có đánh dấu");
});
