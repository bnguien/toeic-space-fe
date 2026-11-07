import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";
import { MemoryRouter } from "react-router-dom";

test("review regressions: Vietnamese errors, accessible cards and Admin Preview Parts 1–7", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { practiceError } = await server.ssrLoadModule("/src/modules/practice/utils/practice.ts");
    const { PracticeState } = await server.ssrLoadModule(
      "/src/modules/practice/components/PracticeState.tsx",
    );
    assert.ok(
      renderToStaticMarkup(createElement(PracticeState, { pending: true })).includes(
        'role="status"',
      ),
    );
    assert.ok(
      renderToStaticMarkup(createElement(PracticeState, { empty: "Chưa có dữ liệu" })).includes(
        "Chưa có dữ liệu",
      ),
    );
    const errorState = renderToStaticMarkup(
      createElement(PracticeState, {
        error: {
          isAxiosError: true,
          response: { status: 403, data: { detail: "Forbidden English" } },
        },
        retry: () => {},
      }),
    );
    assert.ok(
      errorState.includes('role="alert"') &&
        errorState.includes("Thử lại") &&
        !errorState.includes("Forbidden English"),
    );
    const { usePracticeFilters } = await server.ssrLoadModule(
      "/src/modules/practice/hooks/usePracticeFilters.ts",
    );
    function FilterProbe() {
      const { filters, page } = usePracticeFilters();
      return createElement(
        "p",
        null,
        `${filters.search}|${filters.part}|${filters.kind}|${filters.level}|${filters.status}|${page}`,
      );
    }
    const restoredFilters = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        {
          initialEntries: ["/?search=travel&part=Part7&kind=Level&level=3&status=Archived&page=4"],
        },
        createElement(FilterProbe),
      ),
    );
    assert.ok(restoredFilters.includes("travel|Part7|Level|3|Archived|4"));
    for (const [status, code, expected] of [
      [400, "validation_error", "Thông tin chưa hợp lệ"],
      [403, "forbidden", "không có quyền"],
      [404, "not_found", "Không tìm thấy"],
      [409, "duplicate_code", "đã tồn tại"],
      [409, "practice_set_not_publishable", "Chưa thể xuất bản"],
      [409, "concurrency_conflict", "đã thay đổi"],
    ]) {
      const message = practiceError({
        isAxiosError: true,
        response: {
          status,
          data: {
            code,
            detail: "English internal details",
            errors: { Title: ["English validation"] },
          },
        },
      });
      assert.ok(message.includes(expected), message);
      assert.ok(!message.includes("English"));
    }
    const { PracticeQuestionCard } = await server.ssrLoadModule(
      "/src/modules/practice/components/PracticeQuestionCard.tsx",
    );
    const card = renderToStaticMarkup(
      createElement(PracticeQuestionCard, {
        question: {
          questionNumber: 131,
          questionText: "Accessible question prompt",
          difficultyLevel: "Easy",
          status: "Archived",
          topic: "Travel",
        },
        part: "Part6",
        number: 2,
        selected: true,
        onClick: () => {},
      }),
    );
    assert.ok(card.includes("Vị trí 2 · Câu gốc 131"));
    assert.ok(card.includes("Không hoạt động (Archived)"));
    assert.ok(card.includes("Accessible question prompt") && card.includes("Travel"));
    assert.ok(!card.includes('aria-label="Xem chi tiết'));

    const { QuestionPreview } = await server.ssrLoadModule(
      "/src/modules/admin/components/exam-bank/QuestionPreview.tsx",
    );
    for (let part = 1; part <= 7; part++) {
      const client = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, retry: false } },
      });
      const grouped = [3, 4, 6, 7].includes(part);
      const question = {
        id: `question-${part}`,
        part: `Part${part}`,
        status: "Active",
        difficultyLevel: "Easy",
        questionNumber: 131,
        questionText: `Prompt part ${part}`,
        passageId: grouped ? `passage-${part}` : null,
        optionA: "Option Alpha",
        optionB: "Option Beta",
        optionC: "Option Gamma",
        optionD: "Option Delta",
        transcript: part <= 4 ? "English listening transcript" : null,
        transcriptTranslation: part <= 4 ? "Bản dịch lời thoại" : null,
        audioUrl: part <= 4 ? "https://example.com/audio.mp3" : null,
        imageUrl: part === 1 ? "https://example.com/image.png" : null,
        correctAnswer: "B",
        explanation: `Giải thích Part ${part}`,
      };
      client.setQueryData(["exam-bank", "question", question.id], question);
      if (grouped)
        client.setQueryData(["exam-bank", "passage", question.passageId], {
          id: question.passageId,
          content: "Reading context ____131____",
          contentTranslation: "Bản dịch đoạn văn",
          transcript: "English passage transcript",
          questions: [question],
        });
      const html = renderToStaticMarkup(
        createElement(
          QueryClientProvider,
          { client },
          createElement(QuestionPreview, { id: question.id, part, onSelect: () => {} }),
        ),
      );
      assert.ok(html.includes(`Prompt part ${part}`));
      for (const option of ["Alpha", "Beta", "Gamma"]) assert.ok(html.includes(`Option ${option}`));
      assert.equal(html.includes("Option Delta"), part !== 2);
      assert.ok(html.includes("Đáp án đúng: B") && html.includes(`Giải thích Part ${part}`));
      assert.equal(html.includes("Bản chép lời"), part <= 4);
      if (part <= 4) assert.ok(html.includes("English listening transcript"));
      if (grouped) assert.ok(html.includes("Bản dịch đoạn văn"));
      if (part === 6) assert.ok(html.includes('aria-label="chỗ trống câu 131"'));
      if (part === 1) assert.ok(html.includes("image.png"));
      client.clear();
    }
  } finally {
    await server.close();
  }
});
