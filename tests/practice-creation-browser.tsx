// Synthetic, isolated browser fixture: never sends requests to the real API.
import React, { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuthStore } from "../src/modules/auth";
import { httpClient } from "../src/services/http";
import { PracticeSetEditorPage } from "../src/modules/practice/pages/PracticeSetEditorPage";
import { PracticeSetManagementPage } from "../src/modules/practice/pages/PracticeSetManagementPage";
import type { PracticeSetDetail } from "../src/modules/practice/api/practice-sets.api";
import "../src/styles/globals.css";

const owner = "00000000-0000-4000-8000-000000000002";
const records = new Map<string, PracticeSetDetail>();
const listeners = new Set<() => void>();
let creates = 0;
let failSave = false;
let summary = "Saved sets: 0 | Create requests: 0";
const notify = () => {
  summary = `Saved sets: ${records.size} | Create requests: ${creates}`;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const questions = [4, 5].flatMap((part) =>
  [1, 2].map((index) => ({
    id: `00000000-0000-4000-8000-0000000000${part}${index}`,
    part: `Part${part}`,
    questionNumber: index,
    questionText: `Synthetic Part ${part} question ${index}`,
    optionA: "Alpha",
    optionB: "Beta",
    optionC: "Gamma",
    optionD: "Delta",
    correctAnswer: "A",
    explanation: "Synthetic explanation",
    difficultyLevel: "Easy",
    status: "Active",
  })),
);
useAuthStore.setState({
  status: "authenticated",
  user: { id: owner, role: "Teacher", fullName: "Synthetic Teacher" } as never,
  accessToken: "synthetic-only",
});
httpClient.defaults.adapter = async (config) => {
  const url = config.url ?? "";
  const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
  const response = (data: unknown, status = 200) => ({
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  });
  if (config.method === "post" && url.endsWith("/practice-sets")) {
    creates++;
    notify();
    if (failSave)
      throw new AxiosError(
        "Synthetic conflict",
        "ERR_BAD_RESPONSE",
        config,
        undefined,
        response({ code: "practice_set_not_publishable" }, 409),
      );
    const saved: PracticeSetDetail = {
      ...body,
      id: crypto.randomUUID(),
      status: body.status ?? "Draft",
      createdByUserId: owner,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      items: (body.questionIds ?? []).map((questionId: string, orderIndex: number) => ({
        questionId,
        orderIndex,
      })),
    };
    records.set(saved.id, saved);
    notify();
    return response(saved, 201);
  }
  if (config.method !== "get") throw new Error(`Unexpected write: ${config.method} ${url}`);
  if (url.endsWith("/questions")) {
    const items = questions.filter((q) => q.part === config.params.part);
    return response({ items, totalCount: items.length, totalPages: 1, pageIndex: 1, pageSize: 20 });
  }
  const saved = [...records.values()].find((set) => url.includes(set.id));
  if (saved && url.endsWith("/content"))
    return response({
      id: saved.id,
      questionCount: saved.items.length,
      includesAnswers: true,
      parts: [
        {
          part: saved.part,
          passages: [],
          standaloneQuestions: saved.items.map((item) =>
            questions.find((q) => q.id === item.questionId),
          ),
        },
      ],
    });
  if (saved) return response(saved);
  if (url.endsWith("/practice-sets"))
    return response({
      items: [...records.values()].map((set) => ({ ...set, questionCount: set.items.length })),
      totalCount: records.size,
      totalPages: records.size ? 1 : 0,
      pageIndex: 1,
      pageSize: 12,
    });
  throw new Error(`Unexpected read: ${url}`);
};
function Layout() {
  const state = useSyncExternalStore(subscribe, () => summary);
  return (
    <>
      <aside style={{ padding: 16, background: "#eef" }}>
        <strong>{state}</strong>
        {" | "}
        <Link to="/teacher/practice-sets/create">New set</Link>
        {" | "}
        <Link to="/teacher/practice-sets">Practice sets</Link>
        {" | "}
        <label>
          <input
            type="checkbox"
            onChange={(event) => {
              failSave = event.target.checked;
            }}
          />
          Fail create
        </label>
      </aside>
      <Outlet />
    </>
  );
}
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/tests/practice-creation-browser.html", element: <PracticeSetEditorPage /> },
      { path: "/teacher/practice-sets/create", element: <PracticeSetEditorPage /> },
      { path: "/teacher/practice-sets/:id/edit", element: <PracticeSetEditorPage /> },
      { path: "/teacher/practice-sets", element: <PracticeSetManagementPage /> },
    ],
  },
]);
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
});
const root = createRoot(document.getElementById("root")!);
root.render(
  <QueryClientProvider client={client}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
export { records, router, root, client };
