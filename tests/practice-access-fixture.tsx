// Isolated test harness. The Axios adapter never contacts a real API.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuthStore } from "../src/modules/auth";
import { httpClient } from "../src/services/http";
import { PracticeSetEditorPage } from "../src/modules/practice/pages/PracticeSetEditorPage";
import { PracticeSetDetailPage } from "../src/modules/practice/pages/PracticeSetDetailPage";

export function mountPracticeFixture() {
  const id = "00000000-0000-4000-8000-000000000001";
  const owner = "00000000-0000-4000-8000-000000000002";
  const questions = [1, 2, 3].map((number) => ({
    id: `00000000-0000-4000-8000-00000000001${number}`,
    part: "Part5",
    questionNumber: number,
    questionText: `Protected question ${number}`,
    optionA: "Alpha",
    optionB: "Beta",
    optionC: "Gamma",
    optionD: "Delta",
    correctAnswer: "B",
    explanation: "Protected explanation",
    status: "Active",
    difficultyLevel: "Easy",
    imageUrl: "https://example.com/protected-preview.png",
    audioUrl: "https://example.com/protected-preview.mp3",
  }));
  const set = {
    id,
    code: "ACCESS-FIXTURE",
    title: "Protected Practice",
    description: null,
    kind: "Topic",
    part: "Part5",
    level: null,
    targetScore: null,
    durationMinutes: 30,
    status: "Draft",
    orderIndex: 0,
    createdByUserId: owner,
    createdAt: "2026-11-07T01:00:00",
    updatedAt: null,
    items: questions.slice(0, 2).map((q, orderIndex) => ({ questionId: q.id, orderIndex })),
  };
  let deleted = false;
  let contentDenied = false;
  let offline = false;
  let writes = 0;
  let detailReads = 0;
  let lastSave: { questionIds: string[]; expectedQuestionIds: string[] } | null = null;
  const replace = (ids: string[]) => {
    set.items = ids.map((questionId, orderIndex) => ({ questionId, orderIndex }));
  };
  const login = (role: "Teacher" | "User") =>
    useAuthStore.setState({
      status: "authenticated",
      accessToken: "synthetic-only",
      user: { id: owner, role, fullName: "Synthetic user" } as never,
    });
  login("Teacher");
  httpClient.defaults.adapter = async (config) => {
    const url = config.url ?? "";
    const response = (data: unknown, status = 200) => ({
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    });
    const failure = (status: number, code: string) =>
      new AxiosError(code, "ERR_BAD_RESPONSE", config, undefined, response({ code }, status));
    if (offline) throw new AxiosError("Synthetic offline", "ERR_NETWORK", config);
    if (config.method === "put" && url.endsWith("/items")) {
      writes++;
      const body = JSON.parse(config.data);
      lastSave = body;
      if (
        JSON.stringify(body.expectedQuestionIds) !==
        JSON.stringify(set.items.map((item) => item.questionId))
      )
        throw failure(409, "concurrency_conflict");
      replace(body.questionIds);
      return response(structuredClone(set));
    }
    if (config.method !== "get") throw new Error(`Unexpected write: ${url}`);
    if (url.endsWith("/questions"))
      return response({
        items: questions,
        totalCount: 3,
        totalPages: 1,
        pageIndex: 1,
        pageSize: 20,
      });
    const student = useAuthStore.getState().user?.role === "User";
    if (deleted || (student && set.status !== "Active")) throw failure(404, "not_found");
    if (url.endsWith("/content")) {
      if (contentDenied) throw failure(403, "forbidden");
      return response({
        id,
        questionCount: set.items.length,
        includesAnswers: true,
        parts: [
          {
            part: "Part5",
            passages: [],
            standaloneQuestions: set.items.map((item) =>
              questions.find((q) => q.id === item.questionId),
            ),
          },
        ],
      });
    }
    detailReads++;
    return response(structuredClone(set));
  };
  // App defaults deliberately favor caching; Preview must override them locally.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const router = createMemoryRouter(
    [
      { path: "/teacher/practice-sets/:id/edit", element: <PracticeSetEditorPage /> },
      { path: "/practice/parts/:id", element: <PracticeSetDetailPage /> },
      { path: "/practice/parts", element: <p>Outside Preview</p> },
    ],
    { initialEntries: [`/teacher/practice-sets/${id}/edit`] },
  );
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return {
    client,
    router,
    root,
    id,
    questions,
    set,
    replace,
    login,
    get writes() {
      return writes;
    },
    get lastSave() {
      return lastSave;
    },
    get detailReads() {
      return detailReads;
    },
    deleteSet: () => {
      deleted = true;
    },
    denyContent: (value: boolean) => {
      contentDenied = value;
    },
    setOffline: (value: boolean) => {
      offline = value;
    },
  };
}
