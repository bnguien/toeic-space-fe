import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";

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
    cacheDir: "node_modules/.vite-teacher-session-form-tests",
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

async function click(node, label) {
  assert.ok(node, `Missing control: ${label}`);
  await act(async () => {
    node.click();
  });
  await flush();
}

function bodyText() {
  return globalThis.document.body.textContent;
}

test("teacher can choose a regular or make-up session when creating", async () => {
  const { dom, server } = await harness();
  try {
    const { sessionsApi } = await server.ssrLoadModule("/src/modules/admin/index.ts");
    const { TeacherSessionForm } = await server.ssrLoadModule(
      "/src/modules/teacher/components/TeacherSessionForm.tsx",
    );
    let captured = null;
    let saved = false;
    sessionsApi.previewCreate = async () => ({
      affectedStudentCount: 0,
      conflictCount: 0,
      details: null,
    });
    sessionsApi.create = async (input) => {
      captured = input;
      return {};
    };

    const client = new QueryClient();
    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(TeacherSessionForm, {
            classId,
            teacherId,
            defaultRoomId: null,
            roomChoices: [],
            onClose: () => {},
            onSaved: () => {
              saved = true;
            },
            onConflict: () => {},
          }),
        ),
      );
    });
    await flush();

    assert.ok(bodyText().includes("Thêm buổi học"));
    const typeSelect = globalThis.document.querySelector(
      '[role="combobox"][aria-label="Loại buổi học"]',
    );
    assert.ok(typeSelect, "missing session type selector");
    assert.ok(typeSelect.textContent.includes("Buổi học bù"));

    const titleInput = globalThis.document.querySelector("#teacher-session-form input");
    assert.equal(titleInput.value, "Buổi học bù");

    await click(typeSelect, "open session type");
    const regularOption = [...globalThis.document.querySelectorAll('[role="option"]')].find(
      (node) => node.textContent.includes("Buổi chính khóa bổ sung"),
    );
    await click(regularOption, "choose regular session");

    assert.ok(typeSelect.textContent.includes("Buổi chính khóa bổ sung"));
    assert.equal(titleInput.value, "Buổi học chính khóa");

    // Pick a start/end date through the existing pickers so the form can submit.
    const pickerTriggers = () =>
      [...globalThis.document.querySelectorAll('button[aria-haspopup="dialog"]')].filter(
        (node) => node.textContent.includes("dd/mm/yyyy") || node.textContent.includes("/"),
      );
    const days = () =>
      [
        ...globalThis.document.querySelectorAll(
          '[role="dialog"][aria-label="Chọn ngày giờ"] button[aria-label]',
        ),
      ].filter((node) => /^\d+$/.test(node.textContent.trim()) && !node.disabled);

    await click(pickerTriggers()[0], "open start picker");
    await click(days()[0], "choose start date");
    await click(pickerTriggers()[0], "close start picker");

    await click(pickerTriggers()[1], "open end picker");
    await click(days()[1], "choose end date");
    await click(pickerTriggers()[1], "close end picker");

    await click(
      [...globalThis.document.querySelectorAll("button")].find(
        (node) => node.textContent.trim() === "Lưu buổi học",
      ),
      "save session",
    );

    assert.ok(saved, "session should be saved");
    assert.ok(captured, "create request should be captured");
    assert.equal(captured.sessionType, "Regular");
    assert.equal(captured.title, "Buổi học chính khóa");

    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("teacher session conflicts defer updates until confirmation and Back preserves form values", async () => {
  const { dom, server } = await harness();
  try {
    const { sessionsApi } = await server.ssrLoadModule("/src/modules/admin/index.ts");
    const { TeacherSessionForm } = await server.ssrLoadModule(
      "/src/modules/teacher/components/TeacherSessionForm.tsx",
    );
    const warnings = [];
    let previews = 0;
    let updates = 0;
    let saved = 0;
    sessionsApi.previewUpdate = async () => {
      previews += 1;
      return { affectedStudentCount: 2, conflictCount: 3, details: null };
    };
    sessionsApi.update = async () => {
      updates += 1;
      return {};
    };
    const client = new QueryClient();
    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(TeacherSessionForm, {
            classId,
            teacherId,
            defaultRoomId: null,
            roomChoices: [],
            session: {
              id: "session-edit",
              classId,
              teacherId,
              title: "TOEIC Speaking",
              description: null,
              sessionType: "Makeup",
              startAt: "2027-01-05T09:00:00.000Z",
              endAt: "2027-01-05T10:00:00.000Z",
              mode: "Online",
              roomId: null,
              status: "Scheduled",
              version: 4,
              timeOverridden: false,
              roomOverridden: false,
              teacherOverridden: false,
              modeOverridden: false,
              createdAt: "2027-01-01T00:00:00.000Z",
              updatedAt: "2027-01-01T00:00:00.000Z",
            },
            onClose: () => {},
            onSaved: () => {
              saved += 1;
            },
            onConflict: (message) => warnings.push(message),
          }),
        ),
      );
    });
    await flush();

    const reason = globalThis.document.querySelector(
      '#teacher-session-form input[maxlength="500"]',
    );
    await act(async () => {
      const propsKey = Object.keys(reason).find((key) => key.startsWith("__reactProps"));
      reason[propsKey].onChange({ target: { value: "Giáo viên đổi lịch" } });
    });
    await flush();

    const submit = () =>
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Lưu buổi học"),
      );
    await click(submit(), "preview teacher session update");
    assert.ok(bodyText().includes("Cảnh báo trùng lịch học viên"), bodyText());
    assert.ok(bodyText().includes("2 học viên"));
    assert.ok(bodyText().includes("3 xung đột"));
    assert.equal(updates, 0, "preview must not save before consent");

    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Quay lại chỉnh sửa"),
      ),
      "return to editing",
    );
    assert.equal(updates, 0);
    assert.equal(reason.value, "Giáo viên đổi lịch");

    await click(submit(), "preview teacher session update again");
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Vẫn lưu lịch"),
      ),
      "save teacher session despite warning",
    );
    assert.equal(previews, 2);
    assert.equal(updates, 1);
    assert.equal(saved, 1);
    assert.deepEqual(warnings, []);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("teacher and room schedule conflicts remain blocking preview errors and can be retried", async () => {
  const { dom, server } = await harness();
  try {
    const { sessionsApi } = await server.ssrLoadModule("/src/modules/admin/index.ts");
    const { TeacherSessionForm } = await server.ssrLoadModule(
      "/src/modules/teacher/components/TeacherSessionForm.tsx",
    );
    let previews = 0;
    let updates = 0;
    const conflict = new AxiosError(
      "Resource conflict",
      "ERR_BAD_REQUEST",
      {},
      {},
      {
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: {},
        data: { code: "schedule_conflict" },
      },
    );
    sessionsApi.previewUpdate = async () => {
      previews += 1;
      if (previews === 1) throw conflict;
      return { affectedStudentCount: 0, conflictCount: 0, details: null };
    };
    sessionsApi.update = async () => {
      updates += 1;
      return {};
    };
    const client = new QueryClient();
    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(TeacherSessionForm, {
            classId,
            teacherId,
            defaultRoomId: null,
            roomChoices: [],
            session: {
              id: "session-resource-conflict",
              classId,
              teacherId,
              title: "Lớp TOEIC",
              description: null,
              sessionType: "Regular",
              startAt: "2027-01-05T09:00:00.000Z",
              endAt: "2027-01-05T10:00:00.000Z",
              mode: "Online",
              roomId: null,
              status: "Scheduled",
              version: 2,
              timeOverridden: false,
              roomOverridden: false,
              teacherOverridden: false,
              modeOverridden: false,
              createdAt: "2027-01-01T00:00:00.000Z",
              updatedAt: "2027-01-01T00:00:00.000Z",
            },
            onClose: () => {},
            onSaved: () => {},
            onConflict: () => {},
          }),
        ),
      );
    });
    await flush();
    const reason = globalThis.document.querySelector(
      '#teacher-session-form input[maxlength="500"]',
    );
    await act(async () => {
      const propsKey = Object.keys(reason).find((key) => key.startsWith("__reactProps"));
      reason[propsKey].onChange({ target: { value: "Dời lịch" } });
    });
    await flush();
    const submit = () =>
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Lưu buổi học"),
      );
    await click(submit(), "check resource conflict");
    assert.ok(globalThis.document.body.textContent.includes("Xung đột lịch"));
    assert.equal(
      globalThis.document.body.textContent.includes("Cảnh báo trùng lịch học viên"),
      false,
    );
    assert.equal(updates, 0, "teacher/room conflicts must still block the save");
    await click(submit(), "retry resource conflict preview");
    assert.equal(previews, 2);
    assert.equal(updates, 1);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
