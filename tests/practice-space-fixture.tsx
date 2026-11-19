// Isolated harness for the practice space and "Góc luyện tập". The Axios adapter never contacts a
// real API; every response is synthetic.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider, useLocation, useParams } from "react-router-dom";
import { useAuthStore } from "../src/modules/auth";
import { httpClient } from "../src/services/http";
import { PracticeSpacePage } from "../src/modules/practice/pages/PracticeSpacePage";
import { PracticeSetupPage } from "../src/modules/practice/pages/PracticeSetupPage";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const ids = {
  test1: uuid(101),
  test2: uuid(102),
  set1: uuid(201),
  active: uuid(301),
  started: uuid(302),
  learner: uuid(9),
};

const test = (n: number, id: string) => ({
  id,
  code: `ETS-2026-TEST-0${n}`,
  title: `ETS 2026 - Test 0${n}`,
  description: null,
  category: "ETS 2026",
  year: 2026,
  totalQuestions: 200,
  durationMinutes: 120,
  totalListeningQuestions: 100,
  totalReadingQuestions: 100,
  audioUrl: null,
  isActive: true,
  status: "Active",
  createdAt: "2026-11-01T00:00:00",
});

const set = {
  id: ids.set1,
  code: "p1-lv1",
  title: "Part 1 Luyện Tập Căn bản (Mục tiêu 450+)",
  description: null,
  kind: "Level",
  part: "Part1",
  level: 1,
  targetScore: 450,
  durationMinutes: 60,
  status: "Active",
  orderIndex: 1,
  createdByUserId: null,
};

const page = (items: unknown[]) => ({
  items,
  pageIndex: 1,
  pageSize: 100,
  totalCount: items.length,
  totalPages: 1,
});

const attempt = (id: string) => ({
  id,
  mode: "Practice",
  status: "InProgress",
  title: "Part 1 · 20 câu ngẫu nhiên",
  source: {
    kind: "PracticeSet",
    id: ids.set1,
    code: "p1-lv1",
    title: set.title,
    part: 1,
    level: 1,
    targetScore: 450,
  },
  testId: null,
  practiceSetId: ids.set1,
  parts: [1],
  startTime: "2026-11-19T01:00:00Z",
  lastActivityAt: "2026-11-19T01:00:00Z",
  expiresAt: null,
  deadline: null,
  timeLimitSeconds: null,
  serverNow: "2026-11-19T01:00:00Z",
  questions: [
    {
      id: uuid(401),
      sourceQuestionId: uuid(402),
      passageId: null,
      part: 1,
      orderIndex: 0,
      questionNumber: 1,
      questionText: null,
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      audioUrl: null,
      imageUrl: null,
      userAnswer: null,
      revision: 0,
      flagged: false,
      checked: false,
      timeSpentSeconds: 0,
    },
  ],
  passages: [],
});

function Workspace() {
  const { attemptId } = useParams();
  const location = useLocation();
  return (
    <p>
      Workspace {attemptId} {JSON.stringify(location.state)}
    </p>
  );
}

export function mountSpaceFixture(initial: string, role: "User" | null) {
  const requests: { method: string; url: string; params?: unknown; body?: unknown }[] = [];
  const unexpected: string[] = [];
  if (role)
    useAuthStore.setState({
      status: "authenticated",
      accessToken: "synthetic-only",
      user: {
        id: ids.learner,
        role,
        fullName: "Synthetic Learner",
        email: "l@example.com",
      } as never,
    });
  else useAuthStore.setState({ status: "anonymous", accessToken: null, user: null });

  httpClient.defaults.adapter = async (config) => {
    const url = (config.url ?? "").replace("/assessment/api/v1", "");
    const method = config.method ?? "get";
    const body = config.data ? JSON.parse(config.data) : undefined;
    requests.push({ method, url, params: config.params, body });
    const ok = (data: unknown) => ({ data, status: 200, statusText: "OK", headers: {}, config });
    if (method === "post" && url === `/practice-sets/${ids.set1}/attempts`)
      return ok(attempt(ids.started));
    if (method !== "get") throw new Error(`Unexpected write ${method} ${url}`);
    if (url === "/tests/categories")
      return ok([{ category: "ETS 2026", testCount: 2, years: [2026] }]);
    if (url === "/tests") return ok(page([test(1, ids.test1), test(2, ids.test2)]));
    if (url === `/tests/${ids.test1}/attempts/active`)
      return ok({
        attemptId: ids.active,
        mode: "Practice",
        parts: [5],
        answeredCount: 3,
        totalQuestions: 30,
        deadline: null,
        serverNow: "2026-11-19T01:00:00Z",
      });
    if (url === `/tests/${ids.test2}/attempts/active`)
      return ok({
        attemptId: null,
        mode: null,
        parts: [],
        answeredCount: 0,
        totalQuestions: 0,
        deadline: null,
        serverNow: "2026-11-19T01:00:00Z",
      });
    if (url === "/practice-sets") return ok(page([{ ...set, questionCount: 20 }]));
    if (url === `/practice-sets/${ids.set1}`)
      return ok({
        ...set,
        createdAt: "2026-11-01T00:00:00",
        updatedAt: null,
        items: Array.from({ length: 20 }, (_, i) => ({ questionId: uuid(500 + i), orderIndex: i })),
      });
    if (url === `/practice-sets/${ids.set1}/my-questions`)
      return ok(
        Array.from({ length: 20 }, (_, i) => ({
          sourceQuestionId: uuid(500 + i),
          orderIndex: i,
          questionNumber: i + 1,
          part: 1,
          status: i < 2 ? "Correct" : i === 2 ? "Wrong" : "Unanswered",
          lastAnsweredAt: i < 3 ? "2026-11-18T10:00:00Z" : null,
        })),
      );
    if (url === `/practice-sets/${ids.set1}/attempts/active`)
      return ok({ generation: 1, attemptId: null });
    if (url === "/attempts") return ok(page([]));
    if (url === "/me/practice/tests-progress")
      return ok([
        {
          testId: ids.test1,
          status: "InProgress",
          activeAttemptId: ids.active,
          activeMode: "Practice",
          answeredCount: 3,
          totalQuestions: 30,
          completedCount: 0,
          bestTotalScaled: null,
          lastCompletedAttemptId: null,
        },
      ]);
    if (url === "/me/practice/sets-progress")
      return ok([
        {
          practiceSetId: ids.set1,
          totalQuestions: 20,
          answeredQuestions: 3,
          correctQuestions: 2,
          wrongQuestions: 1,
          activeAttemptId: null,
        },
      ]);
    if (url === "/me/practice/stats")
      return ok({
        testsCompleted: 0,
        testsTotal: 2,
        questionsAnswered: 3,
        correctRate: 0.66,
        byPart: [{ part: 1, answered: 3, correct: 2 }],
        scoreTrend: [],
        recent: [],
      });
    unexpected.push(`${method} ${url}`);
    throw new Error(`Unexpected request ${url}`);
  };

  const client = new QueryClient({
    // gcTime 0: no 5-minute garbage-collection timers keep the test process alive.
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const router = createMemoryRouter(
    [
      { path: "/practice/exam", element: <PracticeSpacePage mode="exam" /> },
      { path: "/practice/listening", element: <PracticeSpacePage mode="listening" /> },
      { path: "/practice/parts/:id", element: <PracticeSetupPage /> },
      { path: "/practice/attempts/:attemptId", element: <Workspace /> },
      { path: "/login", element: <p>Login page</p> },
    ],
    { initialEntries: [initial] },
  );
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router, root, requests, unexpected };
}
