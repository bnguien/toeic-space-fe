import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const classId = "11111111-1111-1111-1111-111111111111";
const teacherId = "33333333-3333-3333-3333-333333333333";

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
    cacheDir: "node_modules/.vite-teacher-session-actions-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  return { dom, server };
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await flush();
    if (predicate()) return;
  }
  assert.fail(message);
}

async function click(node, label) {
  assert.ok(node, `Missing control: ${label}`);
  await act(async () => {
    node.click();
  });
  await flush();
}

function menuItems() {
  return [...globalThis.document.querySelectorAll('[role="menuitem"]')].map((node) =>
    node.textContent.trim(),
  );
}

const session = (overrides = {}) => {
  const endAt = new Date(Date.now() - 60 * 60 * 1000);
  const startAt = new Date(endAt.getTime() - 60 * 60 * 1000);
  return {
    id: "session-1",
    classId,
    teacherId,
    title: "Buổi học thử",
    sessionType: "Makeup",
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    mode: "Offline",
    status: "Scheduled",
    timeOverridden: false,
    roomOverridden: false,
    teacherOverridden: false,
    modeOverridden: false,
    version: 1,
    createdAt: startAt.toISOString(),
    updatedAt: startAt.toISOString(),
    ...overrides,
  };
};

async function renderSessions({ server, classStatus, sessions }) {
  const { sessionsApi } = await server.ssrLoadModule("/src/modules/admin/index.ts");
  const { useAuthStore } = await server.ssrLoadModule("/src/modules/auth/index.ts");
  const { TeacherClassSessions } = await server.ssrLoadModule(
    "/src/modules/teacher/components/TeacherClassSessions.tsx",
  );

  sessionsApi.list = async () => ({
    items: sessions,
    page: 1,
    pageSize: 20,
    totalCount: sessions.length,
  });
  sessionsApi.get = async (id) => sessions.find((item) => item.id === id) ?? sessions[0];
  useAuthStore.setState({
    status: "authenticated",
    user: {
      id: teacherId,
      fullName: "Nguyễn Bảo Nguyên",
      email: "teacher@example.com",
      role: "Teacher",
      avatarUrl: null,
    },
    accessToken: "test-token",
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(globalThis.document.getElementById("root"));
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(TeacherClassSessions, {
          classId,
          classStatus,
          defaultRoomId: null,
        }),
      ),
    );
  });
  await waitFor(
    () => globalThis.document.body.textContent.includes("Buổi học thử"),
    "session cards did not render",
  );
  return root;
}

test("teacher session actions keep Chi tiết visible and put allowed actions in a menu", async () => {
  const { dom, server } = await harness();
  try {
    const root = await renderSessions({
      server,
      classStatus: "Active",
      sessions: [
        session(),
        session({
          id: "session-other-teacher",
          title: "Buổi của giáo viên khác",
          teacherId: "99999999-9999-9999-9999-999999999999",
        }),
        session({
          id: "session-completed",
          title: "Buổi đã hoàn thành",
          status: "Completed",
        }),
      ],
    });

    const detailButton = [...globalThis.document.querySelectorAll("button")].find(
      (node) => node.textContent.trim() === "Chi tiết",
    );
    assert.ok(detailButton, "Chi tiết should stay visible");

    const cards = [...globalThis.document.querySelectorAll("[data-session-card]")];
    assert.equal(cards.length, 3, "teacher view should render one card per session");
    assert.equal(
      globalThis.document.querySelector("thead"),
      null,
      "teacher view should not repeat the teacher column",
    );
    assert.ok(
      !globalThis.document.body.textContent.includes("Giáo viên"),
      "teacher cards should not show a teacher column",
    );

    const triggers = globalThis.document.querySelectorAll(
      'button[aria-label^="Thao tác buổi học"]',
    );
    assert.equal(triggers.length, 1, "only actions allowed for this teacher are rendered");

    assert.ok(
      cards.every(
        (card) =>
          card.querySelector('button[aria-label^="Thao tác buổi học"]') ||
          card.querySelector('span[aria-hidden="true"]'),
      ),
      "cards without a menu should keep the action slot aligned",
    );

    await click(triggers[0], "open session actions");
    assert.deepEqual(menuItems(), ["Điều chỉnh", "Hoàn thành", "Hủy buổi học"]);

    const cancelItem = [...globalThis.document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent.trim() === "Hủy buổi học",
    );
    assert.equal(cancelItem.getAttribute("data-tone"), "danger");
    assert.ok(cancelItem.textContent.includes("Hủy buổi học"));

    await click(cancelItem, "cancel session");
    assert.equal(globalThis.document.querySelector('[role="menu"]'), null);
    assert.ok(
      globalThis.document.querySelector("#teacher-cancel-session"),
      "cancel confirmation should open",
    );

    const closeCancel = globalThis.document.querySelector('dialog[open] button[aria-label="Đóng"]');
    await click(closeCancel, "close cancel confirmation");

    await click(triggers[0], "open session actions again");
    const completeItem = [...globalThis.document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent.trim() === "Hoàn thành",
    );
    await click(completeItem, "complete session");
    assert.ok(
      globalThis.document.body.textContent.includes("Hoàn thành buổi học?"),
      "complete confirmation should open",
    );

    await act(async () => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("inactive class hides edit and completion but keeps the allowed cancel action", async () => {
  const { dom, server } = await harness();
  try {
    const root = await renderSessions({
      server,
      classStatus: "Archived",
      sessions: [
        session({
          endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          startAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }),
      ],
    });

    const trigger = globalThis.document.querySelector('button[aria-label^="Thao tác buổi học"]');
    assert.ok(trigger, "cancel should remain available");
    await click(trigger, "open session actions");
    assert.deepEqual(menuItems(), ["Hủy buổi học"]);

    await act(async () => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
