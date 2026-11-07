import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

test("actual student and shared media components preserve order, context, blanks and disclosures", async () => {
  // Vite supplies the application's own TSX, aliases and CSS handling; no extra test dependency.
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { PracticeContent } = await server.ssrLoadModule(
      "/src/modules/practice/components/PracticeContent.tsx",
    );
    const { QuestionMedia } = await server.ssrLoadModule(
      "/src/shared/components/QuestionContent/QuestionMedia.tsx",
    );
    const question = (id, passageId, part, questionNumber) => ({
      id,
      passageId,
      part: `Part${part}`,
      questionNumber,
      questionText: `Prompt ${id}`,
      imageUrl: "https://example.com/shared.png",
      audioUrl: part <= 4 ? "https://example.com/shared.mp3" : null,
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctAnswer: "A",
    });
    for (const part of [3, 4, 6, 7]) {
      for (const [sequence, counts] of [
        [
          ["A", "A", "B"],
          [1, 1],
        ],
        [
          ["A", "B", "A"],
          [2, 1],
        ],
        [
          ["A", "B", "A", "A"],
          [2, 1],
        ],
        [
          ["A", null, "A"],
          [2, 0],
        ],
      ]) {
        const questions = sequence.map((passageId, i) =>
          question(`q${i}`, passageId, part, 131 + i),
        );
        const passages = ["A", "B"].map((id) => ({
          id,
          title: `Context ${id}`,
          content: "Text ____131____ ____132____ ____133____ ____134____",
          imageUrl: "https://example.com/shared.png",
          audioUrl: part <= 4 ? "https://example.com/shared.mp3" : null,
          questions: questions.filter((q) => q.passageId === id),
        }));
        const html = renderToStaticMarkup(
          createElement(PracticeContent, {
            content: {
              parts: [{ passages, standaloneQuestions: questions.filter((q) => !q.passageId) }],
            },
            items: questions.map((q) => ({ questionId: q.id })),
          }),
        );
        assert.equal((html.match(/Context A/g) ?? []).length, counts[0]);
        assert.equal((html.match(/Context B/g) ?? []).length, counts[1]);
        assert.deepEqual(
          [...html.matchAll(/Prompt (q\d)/g)].map((match) => match[1]),
          questions.map((q) => q.id),
        );
        assert.equal(
          (html.match(/<img /g) ?? []).length,
          counts[0] + counts[1] + sequence.filter((p) => p === null).length,
        );
        assert.equal(html.includes("Bản chép lời"), part <= 4);
        if (part <= 4) assert.ok(!/<details[^>]*\sopen/.test(html), "transcripts start collapsed");
      }
    }
    const selected = [question("third", "A", 6, 133), question("first", "A", 6, 131)];
    const html = renderToStaticMarkup(
      createElement(PracticeContent, {
        content: {
          parts: [
            {
              standaloneQuestions: [],
              passages: [
                { id: "A", content: "____131____ ____132____ ____133____", questions: selected },
              ],
            },
          ],
        },
        items: selected.map((q) => ({ questionId: q.id })),
      }),
    );
    assert.deepEqual(
      [...html.matchAll(/aria-label="chỗ trống câu ([^"]+)"/g)].map((m) => m[1]),
      ["2", "132", "1"],
    );
    const media = renderToStaticMarkup(
      createElement(QuestionMedia, {
        image:
          "https://example.com/a.png<image_split>https://example.com/b.png<image_split>https://example.com/a.png",
        audio: "https://example.com/a.mp3<image_split>https://example.com/b.mp3",
        shown: ["https://example.com/a.png"],
        firstAudioOnly: true,
      }),
    );
    assert.equal((media.match(/<img /g) ?? []).length, 1);
    assert.equal((media.match(/<audio /g) ?? []).length, 1);
    assert.ok(
      media.includes('loading="lazy"') &&
        media.includes('preload="none"') &&
        media.includes('controls=""'),
    );
    const { QuestionPreview } = await server.ssrLoadModule(
      "/src/modules/admin/components/exam-bank/QuestionPreview.tsx",
    );
    const client = new QueryClient();
    const teacherQuestion = {
      ...question("teacher", "source", 6, 131),
      status: "Active",
      difficultyLevel: "Medium",
    };
    client.setQueryData(["exam-bank", "question", "teacher"], teacherQuestion);
    client.setQueryData(["exam-bank", "passage", "source"], {
      id: "source",
      content: "____131____ ____132____",
      questions: [teacherQuestion, { id: "other", questionNumber: 132 }],
      imageUrl: "https://example.com/a.png<image_split>https://example.com/b.png",
    });
    const teacher = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(QuestionPreview, { id: "teacher", part: 6, onSelect: () => {} }),
      ),
    );
    assert.ok(teacher.includes('aria-label="chỗ trống câu 131"'));
    assert.ok(teacher.includes('aria-label="chỗ trống câu 132"'));
    assert.equal(teacher.includes("Bản chép lời"), false);
    assert.ok(teacher.includes("(1/2)") && teacher.includes("(2/2)"));
    client.clear();
  } finally {
    await server.close();
  }
});
