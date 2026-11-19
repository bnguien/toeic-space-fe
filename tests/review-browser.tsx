// Local-only synthetic fixture. No API, cookie, imported record or real account is used.
import React from "react";
import "../src/styles/globals.css";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
import { useAuthStore, setupAuthSession } from "../src/modules/auth";
import { httpClient } from "../src/services/http";
import { PracticeSetEditorPage } from "../src/modules/practice/pages/PracticeSetEditorPage";
import { PracticeSetDetailPage } from "../src/modules/practice/pages/PracticeSetDetailPage";
import { PracticeSetManagementPage } from "../src/modules/practice/pages/PracticeSetManagementPage";
import { PracticeSetsPage } from "../src/modules/practice/pages/PracticeSetsPage";
import { practiceKeys } from "../src/modules/practice/hooks/usePracticeSets";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";

const id = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000002";
const key = "pbl26-review-synthetic-set";
const question = (index: number) => ({
  id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
  part: "Part5",
  questionNumber: 101 + index,
  questionText: `Question preview ${index + 1}`,
  optionA: "Alpha",
  optionB: "Beta",
  optionC: "Gamma",
  optionD: "Delta",
  correctAnswer: "A",
  difficultyLevel: "Easy",
  status: "Active",
  topic: "Travel",
});
const questions = Array.from({ length: 2000 }, (_, index) => question(index));
const freshSet = () => ({
  id,
  code: "BROWSER-FIXTURE",
  title: "Synthetic Practice Set",
  description: "Local test data",
  kind: "Topic",
  part: "Part5",
  level: null,
  targetScore: 650,
  durationMinutes: 30,
  status: "Draft",
  orderIndex: 0,
  createdByUserId: owner,
  createdAt: "2026-11-03T01:00:00",
  updatedAt: null,
  items: questions.map((q, orderIndex) => ({ questionId: q.id, orderIndex })),
});
type FixtureSet = ReturnType<typeof freshSet> & { updatedAt: string | null };
const load = (): FixtureSet => JSON.parse(localStorage.getItem(key) ?? JSON.stringify(freshSet()));
const store = (set: FixtureSet) => localStorage.setItem(key, JSON.stringify(set));
if (!localStorage.getItem(key)) store(freshSet());
if (new URLSearchParams(location.search).has("small")) {
  const set = load();
  store({ ...set, items: set.items.slice(0, 3) });
}
useAuthStore.setState({
  status: "authenticated",
  user: { id: owner, role: "Teacher", fullName: "Synthetic Teacher" } as never,
  accessToken: "synthetic-local-only",
});
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: true } },
});
let failSave = false;
let requests = 0;
let listCount = 1;
httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
  requests++;
  document.documentElement.dataset.fixtureRequests = String(requests);
  document.documentElement.dataset.fixtureRequestLog = `${document.documentElement.dataset.fixtureRequestLog ?? ""}\n${Date.now()} ${config.url} ${JSON.stringify(config.params ?? {})}`;
  const url = config.url ?? "";
  const set = load();
  const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
  const response = (data: unknown, status = 200) => ({
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  });
  if (config.method === "put" || config.method === "patch" || config.method === "post") {
    if (failSave)
      throw new AxiosError(
        "Synthetic failure",
        "ERR_BAD_RESPONSE",
        config,
        undefined,
        response({ code: "conflict" }, 409),
      );
    if (body.expectedUpdatedAt && body.expectedUpdatedAt !== (set.updatedAt ?? set.createdAt))
      throw new AxiosError(
        "Conflict",
        "ERR_BAD_RESPONSE",
        config,
        undefined,
        response({ code: "concurrency_conflict" }, 409),
      );
    if (
      url.endsWith("/items") &&
      JSON.stringify(body.expectedQuestionIds) !==
        JSON.stringify(set.items.map((item) => item.questionId))
    )
      throw new AxiosError(
        "Conflict",
        "ERR_BAD_RESPONSE",
        config,
        undefined,
        response({ code: "concurrency_conflict" }, 409),
      );
    if (url.endsWith("/items"))
      set.items = body.questionIds.map((questionId: string, orderIndex: number) => ({
        questionId,
        orderIndex,
      }));
    else Object.assign(set, body);
    set.updatedAt = new Date().toISOString();
    store(set);
    return response(set);
  }
  if (config.method === "delete") {
    listCount = Math.max(0, listCount - 1);
    return response(null, 204);
  }
  if (url.endsWith("/content")) {
    const selected = set.items.map((item) => questions.find((q) => q.id === item.questionId)!);
    const visible =
      useAuthStore.getState().user?.role === "Teacher"
        ? selected
        : selected.filter((q) => q.status === "Active");
    return response({
      id,
      questionCount: visible.length,
      includesAnswers: true,
      parts: [
        {
          part: "Part5",
          passages: [],
          standaloneQuestions: visible,
        },
      ],
    });
  }
  if (url.includes("/questions"))
    return response({
      items: questions.slice(0, 20),
      totalCount: 2000,
      totalPages: 100,
      pageIndex: 1,
      pageSize: 20,
    });
  if (url.endsWith(id)) return response(set);
  const page = Number(config.params?.page ?? 1);
  const count = Math.max(0, Math.min(12, listCount - (page - 1) * 12));
  return response({
    items: Array.from({ length: count }, (_, index) => ({
      ...set,
      id: `${id.slice(0, -2)}${String(index + 1).padStart(2, "0")}`,
      questionCount: set.items.length,
    })),
    totalCount: listCount,
    totalPages: Math.ceil(listCount / 12),
    pageIndex: page,
    pageSize: 12,
  });
};
setupAuthSession(client);
window.addEventListener("storage", () => {
  void client.invalidateQueries({ queryKey: practiceKeys.all });
});
const refresh = () => void client.invalidateQueries({ queryKey: practiceKeys.all });
function FixtureLayout() {
  return (
    <>
      <aside style={{ padding: 16, background: "#eef" }}>
        <b>Local synthetic regression fixture · requests {requests}</b>
        <br />
        <Link to={`/teacher/practice-sets/${id}/edit`}>Editor</Link>
        {" · "}
        <Link to="/teacher/practice-sets">Sidebar management</Link>
        {" · "}
        <Link to={`/practice/parts/${id}`}>Student Preview</Link>
        {" · "}
        <Link to="/practice/parts">Browse</Link>
        <div>
          <button
            onClick={() => {
              listCount = 13;
              refresh();
            }}
          >
            Prepare 13 management rows
          </button>
          <button
            onClick={() =>
              useAuthStore.setState({
                user: { id: owner, role: "User", fullName: "Synthetic Student" } as never,
              })
            }
          >
            Student session
          </button>
          <button
            onClick={() =>
              useAuthStore.setState({
                user: { id: owner, role: "Teacher", fullName: "Synthetic Teacher" } as never,
              })
            }
          >
            Teacher session
          </button>
          <button
            onClick={() => {
              const channel = new BroadcastChannel("toeicspace-auth");
              channel.postMessage({
                type: "login",
                response: {
                  user: { id: owner, role: "User", fullName: "Synthetic Student" },
                  accessToken: "synthetic-local-only",
                },
              });
              channel.close();
            }}
          >
            Cross-tab Student login
          </button>
          <button
            onClick={() => {
              failSave = !failSave;
              document.querySelector("#failure")!.textContent = String(failSave);
            }}
          >
            Toggle failed saves: <span id="failure">false</span>
          </button>
          <button
            onClick={() => {
              const set = load();
              set.title = "External change";
              set.updatedAt = new Date().toISOString();
              store(set);
              refresh();
            }}
          >
            Simulate external metadata save
          </button>
          <button
            onClick={() => {
              const set = load();
              set.status = "Active";
              store(set);
              refresh();
            }}
          >
            Set Active
          </button>
          <button
            onClick={() => {
              questions[0].status = "Archived";
              refresh();
            }}
          >
            Archive first synthetic question
          </button>
          <button
            onClick={() => {
              store(freshSet());
              questions[0].status = "Active";
              refresh();
            }}
          >
            Reset fixture
          </button>
        </div>
      </aside>
      <Outlet />
    </>
  );
}
const router = createBrowserRouter([
  {
    element: <FixtureLayout />,
    children: [
      { path: "/tests/review-browser.html", element: <PracticeSetEditorPage /> },
      { path: "/teacher/practice-sets/:id/edit", element: <PracticeSetEditorPage /> },
      { path: "/teacher/practice-sets/create", element: <PracticeSetEditorPage /> },
      { path: "/teacher/practice-sets", element: <PracticeSetManagementPage /> },
      { path: "/practice/parts/:id", element: <PracticeSetDetailPage /> },
      { path: "/practice/parts", element: <PracticeSetsPage /> },
    ],
  },
]);
if (location.pathname === "/tests/review-browser.html")
  void router.navigate(`/teacher/practice-sets/${id}/edit`, { replace: true });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
