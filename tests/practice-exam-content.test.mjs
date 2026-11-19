import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalSectionName,
  normalizeExplanation,
  parseVocabText,
} from "../src/modules/practice/utils/explanation.ts";
import {
  extractEvidence,
  part5BlankFill,
  part6BlankLabels,
  passageHighlights,
} from "../src/modules/practice/utils/passageMarks.ts";
import {
  buildWordBank,
  distractorPool,
  keywordMatches,
  keywordsOf,
  pickKeywords,
  seededShuffle,
  statementsOf,
  tokenize,
  trueFalseAnswer,
  trueFalseError,
  trueFalseScore,
} from "../src/modules/practice/utils/part1Games.ts";
import {
  AI_PROVIDERS,
  ASK_AI_MAX_CHARS,
  ASK_AI_PROMPTS,
  buildAskAiMessage,
} from "../src/modules/practice/utils/askAi.ts";
import { AttemptAutosave } from "../src/modules/practice/utils/attemptAutosave.ts";

/* ---- Explanation ---- */

test("explanation: JSON vocabulary is pulled out into cards and titles are canonical", () => {
  const json = JSON.stringify([
    { word: "itinerary", pos: "n", meaning_vi: "lịch trình", ipa_us: "aɪˈtɪnəreri", cefr: "B2" },
    { word: "itinerary", pos: "n", meaning_vi: "duplicate" },
  ]).replace(/"/g, "&quot;");
  const html = `<div class='tp-exp-rich-wrapper'><div class='tp-exp-section-title'><span>📖 Dịch nghĩa câu:</span></div><p>Giải thích.</p>
<div class='tp-exp-vocab-card'><div class='tp-exp-section-title'><span>⭐ Từ vựng quan trọng</span></div><div class='tp-exp-vocab-body'>${json}</div></div></div>`;
  const result = normalizeExplanation(html);
  assert.equal(result.vocab.length, 1);
  assert.deepEqual(result.vocab[0], {
    word: "itinerary",
    pos: "n",
    meaningVi: "lịch trình",
    ipa: "aɪˈtɪnəreri",
    exampleEn: "",
    exampleVi: "",
    cefr: "B2",
  });
  assert.ok(!result.html.includes("itinerary"), "raw JSON removed");
  assert.ok(!result.html.includes("tp-exp-vocab-card"), "title-only section removed");
  assert.ok(result.html.includes("🌐 Dịch nghĩa"));
  assert.equal(result.note, "");
});

test("explanation: payload blocks, text tips and plain notes", () => {
  const payload = `<p>Main</p><div class="tp-vocab-data-payload">[{"word":"book","meaning":"đặt"}]</div>`;
  assert.deepEqual(
    normalizeExplanation(payload).vocab.map((v) => [v.word, v.meaningVi]),
    [["book", "đặt"]],
  );
  const textTip = normalizeExplanation("<p>A</p>", { tip: "book (v): đặt\nreturn: trả lại" });
  assert.deepEqual(
    textTip.vocab.map((v) => v.word),
    ["book", "return"],
  );
  const note = normalizeExplanation("<p>A</p>", { tip: "Nhớ xem thì của động từ." });
  assert.equal(note.note, "Nhớ xem thì của động từ.");
  const onlyTip = normalizeExplanation("", { tip: "Mẹo x & y" });
  assert.equal(onlyTip.html, "<p>Mẹo x &amp; y</p>");
  assert.equal(onlyTip.note, "");
  assert.equal(parseVocabText("This is just a sentence about grammar."), null);
  assert.equal(canonicalSectionName("💡 Mẹo làm bài nhanh"), "💡 Mẹo làm bài");
  assert.equal(canonicalSectionName("Other"), "Other");
  assert.deepEqual(normalizeExplanation(null), { html: "", vocab: [], note: "" });
});

/* ---- Passage marks ---- */

const q = (number, extra = {}) => ({
  id: `q${number}`,
  sourceQuestionId: `s${number}`,
  passageId: "p",
  part: 6,
  orderIndex: number,
  number,
  sourceNumber: number,
  text: "",
  options: [
    { key: "A", text: "apply" },
    { key: "B", text: "applied" },
    { key: "C", text: "applying" },
    { key: "D", text: "application" },
  ],
  audioUrl: null,
  imageUrls: [],
  reveal: null,
  ...extra,
});
const reveal = (correctAnswer, explanation = null, transcript = null) => ({
  correctAnswer,
  userAnswer: null,
  isCorrect: null,
  explanation,
  transcript,
  history: [],
});

test("evidence sentences come from tp-eq-en cards or quoted lines", () => {
  assert.equal(
    extractEvidence(`<div class='tp-eq-en'>“The <b>store</b> opens at nine.”</div>`),
    "The store opens at nine.",
  );
  assert.equal(
    extractEvidence('Dẫn chứng: "Please submit the form by Friday."'),
    "Please submit the form by Friday.",
  );
  assert.equal(extractEvidence('Script: "Yes."'), null);
  assert.equal(extractEvidence(null), null);
  const highlights = passageHighlights([
    q(147, { reveal: reveal("A", 'Dẫn chứng: "Our office is closed on Monday."') }),
    q(148),
  ]);
  assert.deepEqual(highlights, [
    { text: "Our office is closed on Monday.", label: "Câu 147", id: "q147" },
  ]);
});

test("Part 6 blank labels map unique source numbers and show the revealed word", () => {
  const questions = [q(131, { number: 1 }), q(132, { number: 2, reveal: reveal("D") })];
  const label = part6BlankLabels(questions, "q131");
  assert.deepEqual(label(131, 0), { label: "1", active: true });
  assert.deepEqual(label(132, 1), { label: "2", active: false, answer: "application" });
  assert.deepEqual(label(199, 2), { label: "199" });
});

test("Part 5 blank shows the choice, then the correct option", () => {
  assert.equal(part5BlankFill(q(101), "B"), "applied");
  assert.equal(part5BlankFill(q(101), null), "");
  assert.equal(part5BlankFill(q(101, { reveal: reveal("C") }), "B"), "applying");
});

/* ---- Part 1 games ---- */

const part1 = (id, options, extra = {}) =>
  q(1, {
    id,
    part: 1,
    options: ["A", "B", "C", "D"].map((key, i) => ({ key, text: options[i] ?? "" })),
    ...extra,
  });

test("statements stay hidden until the question is revealed; transcript fills missing text", () => {
  const hidden = part1("x", ["", "", "", ""]);
  assert.deepEqual(statementsOf(hidden), []);
  const revealed = part1("x", ["", "", "", ""], {
    reveal: reveal(
      "B",
      `<div class="tp-exp-trans-body">(A) Một người đàn ông<br>(B) Hai người</div>`,
      "(A) A man is typing.<br>(B) Two people are shaking hands.<br>(C) A door is open.<br>(D) Chairs are stacked.",
    ),
  });
  const statements = statementsOf(revealed);
  assert.equal(statements.length, 4);
  assert.equal(statements[1].text, "Two people are shaking hands.");
  assert.equal(statements[0].vi, "Một người đàn ông");
});

test("true/false needs exactly one true mark", () => {
  assert.match(trueFalseError({ A: true, B: true }), /chỉ có một câu đúng/);
  assert.match(trueFalseError({}), /Chưa có câu nào Đúng/);
  assert.equal(trueFalseError({ C: true, A: false }), null);
  assert.equal(trueFalseAnswer({ C: true }), "C");
  const statements = ["A", "B", "C", "D"].map((key) => ({ key, text: key, vi: "" }));
  assert.equal(trueFalseScore(statements, { C: true }, "C"), 4);
  assert.equal(trueFalseScore(statements, { A: true }, "C"), 2);
});

test("keywords: longest content word, unique across statements", () => {
  const statements = [
    { key: "A", text: "The woman is arranging some flowers." },
    { key: "B", text: "The woman is watering flowers." },
    { key: "C", text: "They're walking along the beach." },
    { key: "D", text: "A man is on a ladder." },
  ];
  const slots = pickKeywords(statements);
  assert.equal(tokenize(statements[0].text)[slots.A].word, "arranging");
  assert.equal(tokenize(statements[1].text)[slots.B].word, "watering");
  const words = keywordsOf(statements);
  assert.equal(words.C, "walking");
  assert.equal(words.D, "ladder");
  assert.equal(new Set(Object.values(words).map((w) => w.toLowerCase())).size, 4);
  assert.deepEqual(tokenize("flowers."), [{ lead: "", word: "flowers", trail: "." }]);
  assert.ok(keywordMatches("Ladder", "ladder."));
});

test("word bank: own keywords + 2 distractors, stable shuffle", () => {
  const statements = [
    { key: "A", text: "The woman is arranging flowers." },
    { key: "B", text: "Boxes are stacked." },
  ];
  const bank = buildWordBank("q-1", statements, ["arranging", "ladder", "umbrella", "bicycle"]);
  assert.deepEqual(
    bank.map((c) => c.word).sort(),
    ["arranging", "stacked", "ladder", "umbrella"].sort(),
  );
  assert.deepEqual(
    buildWordBank("q-1", statements, ["ladder", "umbrella"]),
    buildWordBank("q-1", statements, ["ladder", "umbrella"]),
  );
  assert.deepEqual(seededShuffle([1, 2, 3, 4, 5], "a"), seededShuffle([1, 2, 3, 4, 5], "a"));
  assert.deepEqual(seededShuffle([1, 2, 3, 4, 5], "a").sort(), [1, 2, 3, 4, 5]);
  const other = part1("o", ["A clock is on the wall.", "Plants are hanging.", "", ""], {
    reveal: reveal("A"),
  });
  const pool = distractorPool("x", [other, part1("hidden", ["secret words", "", "", ""])]);
  assert.ok(pool.includes("clock") || pool.includes("Plants"));
  assert.ok(!pool.includes("secret"));
});

/* ---- Ask AI ---- */

test("ask-AI message holds prompt, passage, options, key and choice, capped at 12k", () => {
  const group = {
    id: "p_1",
    passageId: "1",
    isPassage: true,
    part: 7,
    section: "reading",
    title: "Notice",
    passageType: null,
    content: "The library closes early on Friday.",
    translation: null,
    audioUrl: null,
    imageUrls: [],
    questions: [
      q(147, { part: 7, text: "When does the library close early?", reveal: reveal("B") }),
    ],
    firstNumber: 147,
    lastNumber: 147,
  };
  const message = buildAskAiMessage(ASK_AI_PROMPTS[0], group, () => "C");
  assert.ok(message.startsWith(ASK_AI_PROMPTS[0].prompt));
  assert.match(message, /--- BÀI ĐỌC: Notice ---\nThe library closes early on Friday\./);
  assert.match(message, /Câu 147 \(Part 7\): When does the library close early\?/);
  assert.match(message, /\(D\) application/);
  assert.match(message, /Đáp án đúng: \(B\)/);
  assert.match(message, /Mình chọn: \(C\)/);
  const long = buildAskAiMessage(
    ASK_AI_PROMPTS[1],
    { ...group, content: "x ".repeat(20_000) },
    () => null,
  );
  assert.equal(long.length, ASK_AI_MAX_CHARS);
  assert.deepEqual(
    AI_PROVIDERS.map((p) => p.id),
    ["chatgpt", "gemini", "claude"],
  );
});

/* ---- Autosave: time and flags ---- */

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("autosave sends time with the next save and alone on commitTime", async () => {
  const calls = [];
  let revision = 0;
  const queue = new AttemptAutosave(
    [{ id: "a", userAnswer: null, revision: 0 }],
    async (id, answer, rev, mutationId, time) => {
      calls.push({ id, answer, rev, time });
      revision += 1;
      return { questionId: id, userAnswer: answer, revision, lastActivityAt: "" };
    },
  );
  queue.addTime("a", 12.6);
  queue.select("a", "B");
  await queue.flush();
  assert.deepEqual(calls[0], { id: "a", answer: "B", rev: 0, time: 12 });
  queue.addTime("a", 30);
  await queue.commitTime("a");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].answer, "B");
  assert.equal(calls[1].time, 30); // the 0.6 s remainder waits for a whole second
  await queue.commitTime("a");
  assert.equal(calls.length, 2, "nothing left to send");
  assert.equal(queue.snapshot()[0].status, "saved");
});

test("autosave keeps the old contract for callers without time or flags", async () => {
  const calls = [];
  const queue = new AttemptAutosave(
    [{ id: "a", userAnswer: "A", revision: 3 }],
    async (...args) => {
      calls.push(args.length);
      return { questionId: "a", userAnswer: args[1], revision: 4, lastActivityAt: "" };
    },
  );
  queue.select("a", "C");
  assert.equal(await queue.flush(), true);
  assert.deepEqual(calls, [4]);
  assert.equal(queue.snapshot()[0].revision, 4);
});

test("autosave: answer_locked locks, time_up reports once, checked questions ignore input", async () => {
  const fatal = [];
  const reject = (code) =>
    Object.assign(new Error(code), { response: { status: 409, data: { code } } });
  const queue = new AttemptAutosave(
    [
      { id: "a", userAnswer: null, revision: 0 },
      { id: "b", userAnswer: null, revision: 0 },
      { id: "c", userAnswer: null, revision: 0 },
      { id: "d", userAnswer: "A", revision: 1, checked: true },
    ],
    async (id) => {
      throw reject(id === "a" ? "answer_locked" : "attempt_time_up");
    },
    { onFatal: (code) => fatal.push(code) },
  );
  queue.select("a", "B");
  queue.select("b", "B");
  queue.select("c", "C");
  queue.select("d", "D");
  await queue.flush();
  const [a, b, c, d] = queue.snapshot();
  assert.equal(a.status, "locked");
  assert.equal(a.selected, null);
  assert.equal(b.status, "error");
  assert.equal(c.status, "error");
  assert.deepEqual(fatal, ["attempt_time_up"]);
  assert.equal(d.status, "locked");
  assert.equal(d.selected, "A");
  queue.lock([{ id: "b", userAnswer: "B" }]);
  assert.equal(queue.snapshot()[1].status, "locked");
  assert.equal(queue.snapshot()[1].saved, "B");
});

test("autosave flags: optimistic, latest wins, failure reverts", async () => {
  const sent = [];
  let fail = false;
  const queue = new AttemptAutosave(
    [{ id: "a", userAnswer: null, revision: 0, flagged: false }],
    async () => ({ questionId: "a", userAnswer: null, revision: 1, lastActivityAt: "" }),
    {
      saveFlag: async (id, flagged) => {
        sent.push(flagged);
        await tick();
        if (fail) throw new Error("offline");
        return { flagged };
      },
    },
  );
  const first = queue.toggleFlag("a");
  assert.equal(queue.snapshot()[0].flagged, true);
  queue.toggleFlag("a"); // back to false while the first request flies
  queue.toggleFlag("a"); // and true again
  await first;
  assert.deepEqual(sent, [true]);
  assert.equal(queue.snapshot()[0].flagged, true);
  assert.equal(queue.snapshot()[0].flagStatus, "saved");
  fail = true;
  await queue.toggleFlag("a");
  assert.equal(queue.snapshot()[0].flagged, true, "reverted to the server value");
  assert.equal(queue.snapshot()[0].flagStatus, "error");
});
