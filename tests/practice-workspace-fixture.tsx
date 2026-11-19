// Isolated harness of the practice workspace. The Axios adapter never contacts a real API.
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuthStore } from "../src/modules/auth";
import { httpClient } from "../src/services/http";
import { PracticeWorkspacePage } from "../src/modules/practice/pages/PracticeWorkspacePage";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const NOW = "2026-11-19T01:00:00Z";

type Part = 1 | 2 | 3 | 5 | 7;
type Key = "A" | "B" | "C" | "D";

interface FixtureOptions {
  /** "mixed" (P1, P2, P3 group, P5, P7 group), "part1" (three Part 1 photos) or "fulltest". */
  kind?: "mixed" | "part1" | "fulltest";
  /** Initial route, e.g. `/practice/attempts/<id>/review`. */
  path?: "live" | "review";
  state?: unknown;
}

function question(n: number, part: Part, number: number, extra: Record<string, unknown> = {}) {
  return {
    id: uuid(100 + n),
    sourceQuestionId: uuid(200 + n),
    passageId: null,
    part,
    orderIndex: n,
    questionNumber: number,
    questionText: part <= 2 ? null : `Question text ${number}`,
    optionA: part <= 2 ? `Secret statement A${number}` : `Alpha ${number}`,
    optionB: part <= 2 ? `Secret statement B${number}` : `Beta ${number}`,
    optionC: part <= 2 ? `Secret statement C${number}` : `Gamma ${number}`,
    optionD: part === 2 ? null : part === 1 ? `Secret statement D${number}` : `Delta ${number}`,
    audioUrl: part <= 2 ? `https://example.com/q${number}.mp3` : null,
    imageUrl: part === 1 ? `https://example.com/photo${number}.png` : null,
    userAnswer: null,
    revision: 0,
    flagged: false,
    checked: false,
    timeSpentSeconds: 0,
    ...extra,
  };
}

export function mountWorkspaceFixture({
  kind = "mixed",
  path = "live",
  state,
}: FixtureOptions = {}) {
  const attemptId = uuid(1);
  const testId = uuid(2);
  const p3 = uuid(30);
  const p7 = uuid(70);
  const questions =
    kind === "part1"
      ? [question(1, 1, 1), question(2, 1, 2), question(3, 1, 3)]
      : [
          question(1, 1, 1),
          question(2, 2, 7),
          question(3, 3, 32, { passageId: p3 }),
          question(4, 3, 33, { passageId: p3 }),
          question(5, 5, 101, { questionText: "101. The report was ------- yesterday." }),
          question(6, 7, 147, { passageId: p7 }),
          question(7, 7, 148, { passageId: p7 }),
        ];
  const passages =
    kind === "part1"
      ? []
      : [
          {
            id: p3,
            part: 3,
            passageType: null,
            title: null,
            content: null,
            audioUrl: "https://example.com/p3.mp3",
            imageUrl: null,
            orderIndex: 0,
          },
          {
            id: p7,
            part: 7,
            passageType: null,
            title: null,
            content: "<p>Our office is closed on Monday. Please call again.</p>",
            audioUrl: null,
            imageUrl: null,
            orderIndex: 1,
          },
        ];
  const answers = new Map<string, Key | null>();
  const checked = new Set<string>();
  const calls = { check: [] as string[][], saves: 0, flags: 0, submits: 0 };

  const correctOf = () => "A" as Key;
  const revealRow = (q: (typeof questions)[number]) => {
    const userAnswer = answers.get(q.id) ?? null;
    const correctAnswer = correctOf();
    const number = q.questionNumber;
    return {
      questionId: q.id,
      correctAnswer,
      userAnswer,
      isCorrect: userAnswer ? userAnswer === correctAnswer : null,
      explanation: `<p>Because of reason ${number}.</p>`,
      transcript:
        q.part === 1
          ? `(A) The man is reading ${number}. (B) The man is writing. (C) The man is eating. (D) The man is sleeping.<hr/>(A) Người đàn ông đang đọc. (B) Đang viết. (C) Đang ăn. (D) Đang ngủ.`
          : q.part === 2
            ? `W-Am: Where is the station? (A) Next to the bank. (B) Yes, I do. (C) At noon.<hr/>Nhà ga ở đâu?`
            : null,
      history: [],
    };
  };
  const passageRows = (ids: Set<string>) =>
    passages
      .filter((p) => questions.some((q) => q.passageId === p.id && ids.has(q.id)))
      .map((p) => ({
        id: p.id,
        content:
          p.part === 3 ? "<p>M: Did you see the memo about Monday?</p>" : (p.content ?? "<p></p>"),
        translation: "<p>Bản dịch đoạn văn.</p>",
      }));
  const result = () => {
    const correct = questions.filter((q) => answers.get(q.id) === "A").length;
    const answered = questions.filter((q) => answers.get(q.id)).length;
    return {
      attemptId,
      mode: kind === "fulltest" ? "FullTest" : "Practice",
      status: "Completed",
      title: "Fixture test · Luyện tập",
      source: {
        kind: "Test",
        id: testId,
        code: "FIX-01",
        title: "Fixture test",
        category: null,
        part: null,
        level: null,
        targetScore: null,
      },
      parts: [1, 2, 3, 5, 7],
      startTime: NOW,
      endTime: NOW,
      durationSeconds: 125,
      score: {
        questionCount: questions.length,
        answered,
        correct,
        listeningCorrect: correct,
        listeningTotal: 4,
        readingCorrect: 0,
        readingTotal: 3,
        listeningScaled: null,
        readingScaled: null,
        totalScaled: null,
        cefr: null,
      },
      byPart: [],
      answers: questions.map((q) => ({
        questionId: q.id,
        sourceQuestionId: q.sourceQuestionId,
        questionNumber: q.questionNumber,
        part: q.part,
        orderIndex: q.orderIndex,
        userAnswer: answers.get(q.id) ?? null,
        correctAnswer: "A",
        isCorrect: answers.get(q.id) ? answers.get(q.id) === "A" : null,
        flagged: false,
      })),
    };
  };
  let completed = false;
  const attempt = (review: boolean) => ({
    id: attemptId,
    mode: kind === "fulltest" ? "FullTest" : "Practice",
    status: review || completed ? "Completed" : "InProgress",
    title: "Fixture test · Luyện tập",
    source: {
      kind: kind === "part1" ? "PracticeSet" : "Test",
      id: kind === "part1" ? uuid(9) : testId,
      code: "FIX-01",
      title: kind === "part1" ? "Part 1 Căn bản" : "Fixture test",
      category: null,
      part: kind === "part1" ? 1 : null,
      level: null,
      targetScore: null,
    },
    testId: kind === "part1" ? null : testId,
    practiceSetId: kind === "part1" ? uuid(9) : null,
    parts: kind === "part1" ? [1] : [1, 2, 3, 5, 7],
    startTime: NOW,
    lastActivityAt: NOW,
    expiresAt: null,
    deadline: null,
    timeLimitSeconds: null,
    serverNow: NOW,
    questions: questions.map((q) => ({
      ...q,
      userAnswer: answers.get(q.id) ?? null,
      checked: checked.has(q.id),
    })),
    passages: review
      ? passages.map((p) => ({
          ...p,
          content: p.part === 3 ? "<p>M: Did you see the memo about Monday?</p>" : p.content,
        }))
      : passages,
    reveal: review
      ? {
          questions: questions.map(revealRow),
          passages: passageRows(new Set(questions.map((q) => q.id))),
        }
      : { questions: [], passages: [] },
  });

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "synthetic-only",
    user: { id: uuid(5), role: "User", fullName: "Synthetic learner" } as never,
  });
  httpClient.defaults.adapter = async (config) => {
    const url = config.url ?? "";
    const method = (config.method ?? "get").toLowerCase();
    const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? {});
    const response = (data: unknown, status = 200) => ({
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    });
    const answerMatch = /attempts\/[^/]+\/answers\/([^/]+)$/.exec(url);
    if (method === "put" && answerMatch) {
      calls.saves += 1;
      const id = answerMatch[1];
      if (checked.has(id)) {
        throw new AxiosError(
          "locked",
          "ERR_BAD_RESPONSE",
          config,
          undefined,
          response({ code: "answer_locked" }, 409),
        );
      }
      answers.set(id, body.answer);
      return response({
        questionId: id,
        userAnswer: body.answer,
        revision: body.expectedRevision + 1,
        lastActivityAt: NOW,
      });
    }
    const flagMatch = /attempts\/[^/]+\/flags\/([^/]+)$/.exec(url);
    if (method === "put" && flagMatch) {
      calls.flags += 1;
      return response({ questionId: flagMatch[1], flagged: body.flagged });
    }
    if (method === "post" && url.endsWith("/check")) {
      const ids: string[] = body.questionIds;
      calls.check.push(ids);
      ids.forEach((id) => checked.add(id));
      return response({
        questions: questions.filter((q) => ids.includes(q.id)).map(revealRow),
        passages: passageRows(new Set(ids)),
      });
    }
    if (method === "post" && url.endsWith("/submit")) {
      calls.submits += 1;
      completed = true;
      return response(result());
    }
    if (url.endsWith("/result")) return response(result());
    if (url.endsWith("/review")) return response(attempt(true));
    if (url.endsWith(`/attempts/${attemptId}`)) return response(attempt(false));
    throw new AxiosError("Unexpected request", "ERR_BAD_REQUEST", config);
  };

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { gcTime: 0 },
    },
  });
  const initial =
    path === "review"
      ? `/practice/attempts/${attemptId}/review`
      : `/practice/attempts/${attemptId}`;
  const router = createMemoryRouter(
    [
      { path: "/practice/attempts/:attemptId", element: <PracticeWorkspacePage /> },
      {
        path: "/practice/attempts/:attemptId/review",
        element: <PracticeWorkspacePage reviewOnly />,
      },
      { path: "/practice/attempts/:attemptId/result", element: <p>RESULT PAGE</p> },
      { path: "/practice/tests/:testId/exam", element: <p>EXAM ROOM</p> },
      { path: "/practice/parts/:id", element: <p>SETUP PAGE</p> },
      { path: "/practice/exam", element: <p>EXAM SPACE</p> },
    ],
    { initialEntries: [{ pathname: initial, state }] },
  );
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router, root, questions, calls, attemptId };
}
