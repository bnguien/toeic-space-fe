import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";

const classId = "11111111-1111-4111-8111-111111111111";
const teacherId = "22222222-2222-4222-8222-222222222222";
const roomId = "33333333-3333-4333-8333-333333333333";
const sessionId = "44444444-4444-4444-8444-444444444444";
const session = {
  id: sessionId,
  classId,
  teacherId,
  title: "Buổi TOEIC",
  description: null,
  sessionType: "Makeup",
  startAt: "2027-01-08T09:00:00.000Z",
  endAt: "2027-01-08T10:00:00.000Z",
  mode: "Offline",
  roomId,
  roomName: "Phòng A1",
  centerName: "Trung tâm",
  status: "Scheduled",
  notes: null,
  version: 3,
  timeOverridden: false,
  roomOverridden: false,
  teacherOverridden: false,
  modeOverridden: false,
  createdAt: "2027-01-01T00:00:00.000Z",
  updatedAt: "2027-01-01T00:00:00.000Z",
};

async function harness() {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const name of [
    "window",
    "document",
    "navigator",
    "localStorage",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLDialogElement",
    "MutationObserver",
    "Event",
    "MouseEvent",
    "Node",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.removeAttribute("open");
  };
  const server = await createServer({
    cacheDir: "node_modules/.vite-admin-session-conflict-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  return { dom, server };
}

const flush = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });

async function click(node, label) {
  assert.ok(node, `missing ${label}`);
  await act(async () => node.click());
  await flush();
}

async function renderClassSessions(server, rows = []) {
  const [{ ClassSessions }, { sessionsApi }, { classesApi }, { facilitiesApi }] = await Promise.all(
    [
      server.ssrLoadModule("/src/modules/admin/components/ClassSessions.tsx"),
      server.ssrLoadModule("/src/modules/admin/api/sessions.api.ts"),
      server.ssrLoadModule("/src/modules/admin/api/classes.api.ts"),
      server.ssrLoadModule("/src/modules/admin/api/facilities.api.ts"),
    ],
  );
  sessionsApi.list = async () => ({ items: rows, page: 1, pageSize: 15, totalCount: rows.length });
  classesApi.teachers = async () => ({
    items: [{ id: teacherId, fullName: "Giáo viên thử", email: "teacher@example.com" }],
    page: 1,
    pageSize: 20,
    totalCount: 1,
  });
  facilitiesApi.listRooms = async () => ({
    items: [
      { id: roomId, name: "Phòng A1", centerId: "center-1", centerName: "Trung tâm", capacity: 20 },
    ],
    page: 1,
    pageSize: 100,
    totalCount: 1,
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(globalThis.document.getElementById("root"));
  act(() => {
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ClassSessions, {
          classId,
          classStatus: "Active",
          defaultRoomId: roomId,
          assignedTeacherId: teacherId,
        }),
      ),
    );
  });
  await flush();
  return { root, sessionsApi };
}

test("Admin session creation previews first and only saves after the warning is accepted", async () => {
  const { dom, server } = await harness();
  try {
    const { root, sessionsApi } = await renderClassSessions(server);
    let previews = 0;
    let creates = 0;
    let releaseFirstPreview;
    sessionsApi.previewCreate = async () => {
      previews += 1;
      if (previews === 1) {
        return new Promise((resolve) => {
          releaseFirstPreview = resolve;
        });
      }
      return { affectedStudentCount: 4, conflictCount: 5, details: null };
    };
    sessionsApi.create = async (input) => {
      creates += 1;
      return { ...session, ...input };
    };

    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Thêm buổi học bù / đột xuất"),
      ),
      "open create-session form",
    );
    const createButton = () =>
      globalThis.document.querySelector('button[form="create-session-form"]');
    await click(createButton(), "preview create session");
    assert.equal(createButton().disabled, true, "the form prevents repeated preview submissions");
    await click(createButton(), "repeated create click while preview is pending");
    assert.equal(previews, 1);
    releaseFirstPreview({ affectedStudentCount: 4, conflictCount: 5, details: null });
    await flush();
    assert.ok(globalThis.document.body.textContent.includes("Cảnh báo trùng lịch học viên"));
    assert.equal(creates, 0);
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Quay lại chỉnh sửa"),
      ),
      "return to session form",
    );
    assert.ok(globalThis.document.querySelector("#create-session-form"));
    assert.equal(creates, 0);
    await click(createButton(), "preview create session again");
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Vẫn lưu lịch"),
      ),
      "save session despite warning",
    );
    assert.equal(previews, 2);
    assert.equal(creates, 1);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("Admin session update previews first and Back does not call the update endpoint", async () => {
  const { dom, server } = await harness();
  try {
    const { root, sessionsApi } = await renderClassSessions(server, [session]);
    let previews = 0;
    let updates = 0;
    sessionsApi.previewUpdate = async () => {
      previews += 1;
      return { affectedStudentCount: 1, conflictCount: 2, details: null };
    };
    sessionsApi.update = async () => {
      updates += 1;
      return session;
    };
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Sửa"),
      ),
      "open edit form",
    );
    const reason = globalThis.document.querySelector('#edit-session-form input[maxlength="500"]');
    await act(async () => {
      const propsKey = Object.keys(reason).find((key) => key.startsWith("__reactProps"));
      reason[propsKey].onChange({ target: { value: "Dời lịch" } });
    });
    await flush();
    const save = () => globalThis.document.querySelector('button[form="edit-session-form"]');
    await click(save(), "preview session update");
    assert.ok(globalThis.document.body.textContent.includes("Cảnh báo trùng lịch học viên"));
    assert.equal(updates, 0);
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Quay lại chỉnh sửa"),
      ),
      "back to edit session",
    );
    assert.equal(reason.value, "Dời lịch");
    assert.equal(updates, 0);
    await click(save(), "preview update again");
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Vẫn lưu lịch"),
      ),
      "confirm session update",
    );
    assert.equal(previews, 2);
    assert.equal(updates, 1);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
