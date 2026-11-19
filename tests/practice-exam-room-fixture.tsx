// Isolated harness for the exam room and the result page. The Axios adapter never contacts a real API.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../src/modules/auth";
import { httpClient } from "../src/services/http";
import { ExamRoomPage } from "../src/modules/practice/pages/ExamRoomPage";
import { AttemptResultPage } from "../src/modules/practice/pages/AttemptResultPage";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** `active`: in-progress attempt reported by `GET tests/{id}/attempts/active` ("FullTest" | "Practice"). */
export function mountExamFixture({
  active = null,
}: { active?: "FullTest" | "Practice" | null } = {}) {
  const testId = uuid(0xa01);
  const attemptId = uuid(0xb01);
  const passageId = uuid(0xc01);
  const userId = uuid(0xd01);
  const now = Date.now();
  const iso = (offset = 0) => new Date(now + offset).toISOString();
  const source = {
    kind: "Test",
    id: testId,
    code: "FIXTURE-01",
    title: "Fixture Test 01",
    category: null,
    part: null,
    level: null,
    targetScore: null,
  };
  const correct: Record<string, "A" | "B" | "C" | "D"> = {};
  const question = (
    n: number,
    part: number,
    text: string,
    options: string[],
    answer: "A" | "B" | "C" | "D",
    passage: string | null = null,
  ) => {
    const id = uuid(0x100 + n);
    correct[id] = answer;
    return {
      id,
      sourceQuestionId: uuid(0x400 + n),
      passageId: passage,
      part,
      orderIndex: n - 100,
      questionNumber: n,
      questionText: text,
      optionA: options[0],
      optionB: options[1],
      optionC: options[2],
      optionD: options[3],
      audioUrl: null,
      imageUrl: null,
      userAnswer: null as string | null,
      revision: 0,
      flagged: false,
      checked: false,
      timeSpentSeconds: 0,
    };
  };
  const questions = [
    question(
      101,
      5,
      "The report ------- yesterday.",
      ["submit", "was submitted", "submits", "submitting"],
      "B",
    ),
    question(
      102,
      5,
      "Please ------- the form.",
      ["complete", "completes", "completed", "completion"],
      "A",
    ),
    question(
      147,
      7,
      "Why is the office closed?",
      ["A move", "A party", "A holiday", "Repairs"],
      "C",
      passageId,
    ),
    question(
      148,
      7,
      "When will it reopen?",
      ["Today", "Sunday", "Monday", "Tuesday"],
      "D",
      passageId,
    ),
  ];
  const passages = [
    {
      id: passageId,
      part: 7,
      passageType: null,
      title: null,
      content: "<p>Notice: The office is closed on Monday for the holiday.</p>",
      audioUrl: null,
      imageUrl: null,
      orderIndex: 0,
    },
  ];
  const answers = new Map<string, string | null>();
  const flags = new Map<string, boolean>();
  const saves: { questionId: string; answer: string | null }[] = [];
  const starts: unknown[] = [];
  let submitted = false;

  const attempt = (status: "InProgress" | "Completed", withReveal = false) => ({
    id: attemptId,
    mode: "FullTest",
    status,
    title: "Fixture Test 01",
    source,
    testId,
    practiceSetId: null,
    parts: [5, 7],
    startTime: iso(-60_000),
    lastActivityAt: iso(),
    expiresAt: null,
    deadline: iso(2 * 3600_000),
    timeLimitSeconds: 7200,
    serverNow: iso(),
    questions: questions.map((q) => ({
      ...q,
      userAnswer: answers.get(q.id) ?? null,
      flagged: flags.get(q.id) ?? false,
    })),
    passages,
    reveal: withReveal
      ? {
          questions: questions.map((q) => {
            const user = answers.get(q.id) ?? null;
            return {
              questionId: q.id,
              correctAnswer: correct[q.id],
              userAnswer: user,
              isCorrect: user ? user === correct[q.id] : null,
              explanation: q.questionNumber === 101 ? "<p>Cần động từ bị động quá khứ.</p>" : null,
              transcript: null,
              history: [],
            };
          }),
          passages: [
            {
              id: passageId,
              content: passages[0].content,
              translation: "Thông báo: văn phòng đóng cửa.",
            },
          ],
        }
      : null,
  });

  const result = () => {
    const rows = questions.map((q) => {
      const user = answers.get(q.id) ?? null;
      return {
        questionId: q.id,
        sourceQuestionId: q.sourceQuestionId,
        questionNumber: q.questionNumber,
        part: q.part,
        orderIndex: q.orderIndex,
        userAnswer: user,
        correctAnswer: correct[q.id],
        isCorrect: user ? user === correct[q.id] : null,
        flagged: flags.get(q.id) ?? false,
      };
    });
    const answered = rows.filter((r) => r.userAnswer).length;
    const right = rows.filter((r) => r.isCorrect).length;
    const byPart = [5, 7].map((part) => {
      const list = rows.filter((r) => r.part === part);
      return {
        part,
        total: list.length,
        answered: list.filter((r) => r.userAnswer).length,
        correct: list.filter((r) => r.isCorrect).length,
      };
    });
    return {
      attemptId,
      mode: "FullTest",
      status: "Completed",
      title: "Fixture Test 01",
      source,
      parts: [5, 7],
      startTime: iso(-60_000),
      endTime: iso(),
      durationSeconds: 754,
      score: {
        questionCount: 4,
        answered,
        correct: right,
        listeningCorrect: 0,
        listeningTotal: 0,
        readingCorrect: right,
        readingTotal: 4,
        listeningScaled: null,
        readingScaled: null,
        totalScaled: null,
        cefr: null,
      },
      byPart,
      answers: rows,
    };
  };

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "synthetic-only",
    user: { id: userId, role: "User", fullName: "Synthetic learner" } as never,
  });
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = (config.url ?? "").replace(/^.*\/api\/v1/, "");
    const method = config.method ?? "get";
    const response = (data: unknown, status = 200) => ({
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    });
    const failure = (status: number, code: string) =>
      new AxiosError(code, "ERR_BAD_RESPONSE", config, undefined, response({ code }, status));
    const body = config.data ? JSON.parse(config.data) : null;
    if (method === "get" && url === `/tests/${testId}`)
      return response({
        id: testId,
        code: "FIXTURE-01",
        title: "Fixture Test 01",
        description: null,
        category: "Fixture",
        year: 2026,
        totalQuestions: 200,
        durationMinutes: 120,
        totalListeningQuestions: 100,
        totalReadingQuestions: 100,
        audioUrl: null,
        isActive: true,
        status: "Active",
        createdAt: iso(),
        passageCount: 1,
        questionCount: 200,
        listeningQuestionCount: 100,
        readingQuestionCount: 100,
        parts: [],
        updatedAt: null,
      });
    if (method === "get" && url === `/tests/${testId}/attempts/active`)
      return response({
        attemptId: active ? (active === "FullTest" ? attemptId : uuid(0xb02)) : null,
        mode: active,
        parts: active === "Practice" ? [5] : [],
        answeredCount: active ? 37 : 0,
        totalQuestions: active ? 200 : 0,
        deadline: active === "FullTest" ? iso(83 * 60_000 + 20_000) : null,
        serverNow: iso(),
      });
    if (method === "post" && url === `/tests/${testId}/attempts`) {
      starts.push(body);
      return response(attempt("InProgress"));
    }
    const answer = /^\/attempts\/([^/]+)\/answers\/([^/]+)$/.exec(url);
    if (method === "put" && answer) {
      if (submitted) throw failure(409, "attempt_not_active");
      answers.set(answer[2], body.answer);
      saves.push({ questionId: answer[2], answer: body.answer });
      return response({
        questionId: answer[2],
        userAnswer: body.answer,
        revision: body.expectedRevision + 1,
        lastActivityAt: iso(),
      });
    }
    const flag = /^\/attempts\/([^/]+)\/flags\/([^/]+)$/.exec(url);
    if (method === "put" && flag) {
      flags.set(flag[2], body.flagged);
      return response({ questionId: flag[2], flagged: body.flagged });
    }
    if (method === "post" && url === `/attempts/${attemptId}/submit`) {
      submitted = true;
      return response(result());
    }
    if (method === "get" && url === `/attempts/${attemptId}/result`) {
      if (!submitted) throw failure(409, "attempt_not_completed");
      return response(result());
    }
    if (method === "get" && url === `/attempts/${attemptId}/review`) {
      if (!submitted) throw failure(409, "attempt_not_completed");
      return response(attempt("Completed", true));
    }
    if (method === "get" && url === `/attempts/${attemptId}`)
      return response(attempt(submitted ? "Completed" : "InProgress"));
    if (method === "get" && /^\/attempts\/[^/]+(\/result|\/review)?$/.test(url))
      throw failure(404, "not_found");
    throw new Error(`Unexpected ${method} ${url}`);
  };

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const router = createMemoryRouter(
    [
      { path: "/practice/tests/:testId/exam", element: <ExamRoomPage /> },
      { path: "/practice/attempts/:attemptId/result", element: <AttemptResultPage /> },
      { path: "/practice/attempts/:attemptId/review", element: <p>Review workspace</p> },
      { path: "/practice/attempts/:attemptId", element: <p>Practice workspace</p> },
      { path: "/practice/exam", element: <p>Exam space</p> },
    ],
    { initialEntries: [`/practice/tests/${testId}/exam`] },
  );
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router, root, testId, attemptId, questions, saves, starts, flags };
}
