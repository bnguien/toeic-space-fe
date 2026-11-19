import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// RichText parses markup with DOMParser and walks Nodes; give the SSR run both.
const { window } = new JSDOM("");
globalThis.DOMParser ??= window.DOMParser;
globalThis.Node ??= window.Node;

const reveal = (correctAnswer, userAnswer, explanation = null) => ({
  correctAnswer,
  userAnswer,
  isCorrect: userAnswer ? userAnswer === correctAnswer : null,
  explanation,
  transcript: null,
  history: [],
});

const options = (texts) => ["A", "B", "C", "D"].map((key, i) => ({ key, text: texts[i] }));

const question = (number, extra = {}) => ({
  id: `00000000-0000-4000-8000-0000000001${number}`,
  sourceQuestionId: `00000000-0000-4000-8000-0000000002${number}`,
  passageId: "00000000-0000-4000-8000-000000000300",
  part: 6,
  orderIndex: number,
  number,
  sourceNumber: number,
  text: "",
  options: options(["apply", "applied", "applying", "application"]),
  audioUrl: null,
  imageUrls: [],
  reveal: null,
  ...extra,
});

test("shared practice components render their states (SSR)", async () => {
  const server = await createServer({
    cacheDir: "node_modules/.vite-practice-exam-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  try {
    const load = (path) => server.ssrLoadModule(path);
    const { RichText } = await load("/src/shared/components/RichText/index.ts");
    const common = await load("/src/modules/practice/components/common/index.ts");
    const client = new QueryClient();
    const html = (element) =>
      renderToStaticMarkup(createElement(QueryClientProvider, { client }, element));

    /* RichText: evidence highlight, numbered blank with answer, filled Part 5 blank. */
    const marked = html(
      createElement(RichText, {
        value: "<p>Welcome. Our office is closed\non Monday. Thanks.</p>",
        variant: "document",
        highlights: [{ text: "Our office is closed on Monday.", label: "Câu 147", id: "q147" }],
      }),
    );
    assert.match(
      marked,
      /<mark[^>]*data-highlight="q147"[^>]*><span[^>]*>Câu 147<\/span>Our office is closed\non Monday\.<\/mark>/,
    );
    const p5 = html(
      createElement(RichText, {
        value: "The ------- was late.",
        dashBlanks: true,
        blankFill: "train",
      }),
    );
    assert.match(p5, /aria-label="chỗ trống đã điền"[^>]*>train</);
    const p6 = html(
      createElement(RichText, {
        value: "Dear ____131____ team",
        blankLabel: () => ({ label: "1", answer: "application" }),
      }),
    );
    assert.match(p6, /chỗ trống câu 1: application/);

    /* OptionBubbles: revealed states and letters-only mode. */
    const revealed = html(
      createElement(common.OptionBubbles, {
        name: "q1",
        options: options(["one", "two", "three", "four"]),
        selected: "C",
        reveal: { correctAnswer: "B", userAnswer: "C" },
      }),
    );
    assert.match(revealed, /data-correct="true"[^]*Đáp án đúng/);
    assert.match(revealed, /data-wrong="true"[^]*Bạn chọn/);
    assert.equal((revealed.match(/disabled=""/g) ?? []).length, 4);
    const letters = html(
      createElement(common.OptionBubbles, {
        name: "q2",
        options: options(["secret one", "secret two", "secret three", "secret four"]),
        selected: null,
        onSelect: () => {},
        lettersOnly: true,
      }),
    );
    assert.ok(!letters.includes("secret"), "Part 1/2 option text stays hidden");
    assert.match(letters, /data-letters="true"/);

    /* PassageView after a check: evidence, Part 6 badge with the correct word, translation. */
    const group = {
      id: "p_1",
      passageId: "00000000-0000-4000-8000-000000000300",
      isPassage: true,
      part: 6,
      section: "reading",
      title: "Questions 131-132 refer to the following text.",
      passageType: null,
      content: "Dear ____131____ team. Please submit the form by Friday.",
      translation: "Kính gửi nhóm.",
      audioUrl: null,
      imageUrls: [],
      questions: [
        question(131, {
          reveal: reveal("D", "D", 'Dẫn chứng: "Please submit the form by Friday."'),
        }),
        question(132),
      ],
      firstNumber: 131,
      lastNumber: 132,
    };
    const passage = html(createElement(common.PassageView, { group }));
    assert.match(passage, /Câu 131<\/span>Please submit the form by Friday\./);
    assert.match(passage, /chỗ trống câu 131: application/);
    assert.match(passage, /Bản dịch/);
    assert.match(passage, /Kính gửi nhóm\./);
    const exam = html(createElement(common.PassageView, { group, examMode: true }));
    assert.ok(!exam.includes("Kính gửi"), "no translation in the exam room");
    assert.ok(!exam.includes("application"), "no answer in the exam room");

    /* Grid drawer: states and legend counts. */
    const cells = [
      {
        questionId: "a",
        number: 1,
        part: 1,
        groupIndex: 0,
        questionIndex: 0,
        answered: true,
        flagged: true,
        current: true,
        locked: false,
        correct: true,
      },
      {
        questionId: "b",
        number: 2,
        part: 1,
        groupIndex: 1,
        questionIndex: 0,
        answered: true,
        flagged: false,
        current: false,
        locked: false,
        correct: false,
      },
      {
        questionId: "c",
        number: 101,
        part: 5,
        groupIndex: 2,
        questionIndex: 0,
        answered: false,
        flagged: false,
        current: false,
        locked: true,
        correct: undefined,
      },
    ];
    const grid = html(
      createElement(common.QuestionGridDrawer, {
        open: true,
        onClose: () => {},
        onJump: () => {},
        cells,
        showResults: true,
        showLocks: true,
      }),
    );
    assert.match(grid, /Đã làm <strong>2<\/strong>\/3/);
    assert.match(grid, /data-result="correct"/);
    assert.match(grid, /data-result="wrong"/);
    assert.match(grid, /aria-label="Câu 101: chưa làm, đã khoá"/);
    assert.match(grid, /Lọc theo phần/);

    /* Explanation with vocabulary cards. */
    const explanation = html(
      createElement(common.ExplanationPanel, {
        question: question(5, {
          reveal: reveal(
            "A",
            "A",
            '<p>Vì vậy chọn A.</p><div class="tp-vocab-data-payload">[{"word":"submit","pos":"v","meaning_vi":"nộp"}]</div>',
          ),
        }),
        defaultOpen: true,
      }),
    );
    assert.match(explanation, /Giải thích câu 5/);
    assert.match(explanation, /1 từ vựng/);
    assert.match(explanation, /submit/);
    assert.match(explanation, /Lưu từ/);
    assert.equal(html(createElement(common.ExplanationPanel, { question: question(6) })), "");

    /* Score widgets. */
    const ring = html(createElement(common.ScoreRing, { value: 650, max: 990, caption: "/990" }));
    assert.match(ring, /650/);
    const bar = html(
      createElement(common.SectionBar, {
        section: "reading",
        scaled: null,
        correct: 15,
        total: 20,
      }),
    );
    assert.match(bar, /75%/);
    assert.match(bar, /Đúng 15\/20 câu/);
    const clock = html(createElement(common.ClockBadge, { seconds: 299, warning: true }));
    assert.match(clock, /data-warning="true"[^]*04:59/);
  } finally {
    await server.close();
  }
});

test("practice routes: every screen is registered, bare and learner-guarded where needed", async () => {
  const server = await createServer({
    cacheDir: "node_modules/.vite-practice-exam-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  try {
    const { practiceRoutes } = await server.ssrLoadModule("/src/modules/practice/routes.tsx");
    const byPath = new Map(practiceRoutes.map((route) => [route.path, route]));
    for (const path of [
      "/practice/exam",
      "/practice/listening",
      "/practice/reading",
      "/practice/history",
      "/practice/tests/:testId/exam",
      "/practice/attempts/:attemptId",
      "/practice/attempts/:attemptId/review",
      "/practice/attempts/:attemptId/result",
    ]) {
      const route = byPath.get(path);
      assert.ok(route, path);
      assert.deepEqual(route.handle, { chrome: "bare" }, path);
      assert.equal(typeof route.lazy, "function", path);
    }
    assert.ok(byPath.get("/practice"));
    assert.ok(byPath.get("/practice/parts"));
    assert.ok(byPath.get("/practice/parts/:id"));
    // Lazy pages resolve to real components.
    const exam = await byPath.get("/practice/exam").lazy();
    assert.ok(exam.element);
    const room = await byPath.get("/practice/tests/:testId/exam").lazy();
    assert.equal(room.element.props.roles[0], "User");
  } finally {
    await server.close();
  }
});
