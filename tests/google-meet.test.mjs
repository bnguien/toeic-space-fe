import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const MEET_URL = "https://meet.google.com/abc-defg-hij";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic";

const session = (overrides = {}) => ({
  id: "22222222-2222-2222-2222-222222222222",
  classId: "11111111-1111-1111-1111-111111111111",
  teacherId: "33333333-3333-3333-3333-333333333333",
  title: "Luyện Listening Part 3",
  description: null,
  sessionType: "Regular",
  startAt: "2099-11-17T02:00:00.000Z",
  endAt: "2099-11-17T03:00:00.000Z",
  mode: "Online",
  roomId: null,
  roomName: null,
  centerName: null,
  status: "Scheduled",
  cancellationReason: null,
  version: 1,
  ...overrides,
});

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
    "HTMLAnchorElement",
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
    cacheDir: "node_modules/.vite-google-meet-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  return { dom, window, server };
}

async function waitFor(predicate, message) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    if (predicate()) return;
  }
  assert.fail(message ?? `Timed out: ${globalThis.document.body.textContent}`);
}

function text() {
  return globalThis.document.body.textContent;
}

function button(label) {
  return [...globalThis.document.querySelectorAll("dialog[open] button, #root button")].find(
    (node) => node.textContent.trim() === label,
  );
}

function dialogButton(label) {
  return [...globalThis.document.querySelectorAll("dialog[open] button")].find(
    (node) => node.textContent.trim() === label,
  );
}

async function click(node, label) {
  assert.ok(node, `Missing control: ${label}`);
  assert.equal(node.disabled, false, label);
  await act(async () => {
    node.click();
  });
}

function mount(client, element) {
  const root = createRoot(globalThis.document.getElementById("root"));
  act(() => {
    root.render(createElement(QueryClientProvider, { client }, element));
  });
  return root;
}

function response(config, data, status = 200) {
  return { data, status, statusText: String(status), headers: {}, config };
}

test("Teacher Google connection: status, connect URL, return refresh and disconnect", async () => {
  const { dom, window, server } = await harness();
  try {
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { TeacherGoogleMeetCard } = await server.ssrLoadModule(
      "/src/modules/teacher/components/TeacherGoogleMeetCard.tsx",
    );
    let connected = false;
    let statusCalls = 0;
    let connectCalls = 0;
    let deleteCalls = 0;
    const opened = [];
    window.open = (url) => {
      opened.push(url);
      return { opener: null, location: { replace: () => {} }, close: () => {} };
    };
    httpClient.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (config.method === "get" && url.endsWith("/google-meet/status")) {
        statusCalls += 1;
        return response(
          config,
          connected
            ? {
                connected: true,
                email: "teacher@example.test",
                connectedAt: "2026-11-17T02:00:00Z",
              }
            : { connected: false, email: null, connectedAt: null },
        );
      }
      if (config.method === "post" && url.endsWith("/google-meet/connect")) {
        connectCalls += 1;
        return response(config, { authorizationUrl: AUTH_URL });
      }
      if (config.method === "delete" && url.endsWith("/google-meet")) {
        deleteCalls += 1;
        connected = false;
        return response(config, null, 204);
      }
      throw new Error(`Unexpected request: ${config.method} ${url}`);
    };

    const client = new QueryClient();
    const root = mount(client, createElement(TeacherGoogleMeetCard));
    await waitFor(() => text().includes("Chưa kết nối"), "connection card should load");

    await click(button("Kết nối Google"), "Kết nối Google");
    await waitFor(() => text().includes("Đã mở trang cấp quyền Google"));
    assert.equal(connectCalls, 1);
    assert.deepEqual(opened, [AUTH_URL]);

    connected = true;
    await click(button("Tôi đã kết nối"), "Tôi đã kết nối");
    await waitFor(() => text().includes("teacher@example.test"));
    assert.ok(statusCalls >= 2);
    assert.ok(!text().includes("Chưa kết nối"));

    await click(button("Ngắt kết nối"), "Ngắt kết nối");
    await waitFor(() => text().includes("Ngắt kết nối Google Meet?"));
    await click(dialogButton("Ngắt kết nối"), "confirm disconnect");
    await waitFor(() => text().includes("Chưa kết nối"));
    assert.equal(deleteCalls, 1);

    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("Teacher Google connection handles an expired session", async () => {
  const { dom, server } = await harness();
  try {
    const { AxiosError } = await import("axios");
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { TeacherGoogleMeetCard } = await server.ssrLoadModule(
      "/src/modules/teacher/components/TeacherGoogleMeetCard.tsx",
    );
    httpClient.defaults.adapter = async (config) => {
      const failure = response(config, { code: "unauthorized" }, 401);
      throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined, failure);
    };
    const client = new QueryClient();
    const root = mount(client, createElement(TeacherGoogleMeetCard));
    await waitFor(() => text().includes("Phiên đăng nhập đã hết"));
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("Meet join fetches the link only on click and reuses it without hover requests", async () => {
  const { dom, window, server } = await harness();
  try {
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { SessionMeetSection } = await server.ssrLoadModule(
      "/src/modules/teacher/components/calendar/SessionMeetSection.tsx",
    );
    let linkCalls = 0;
    let statusCalls = 0;
    const opened = [];
    const navigated = [];
    window.open = (url) => {
      opened.push(url);
      return {
        opener: null,
        location: { replace: (value) => navigated.push(value) },
        close: () => {},
      };
    };
    httpClient.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (url.endsWith("/meet/status")) {
        statusCalls += 1;
        return response(config, { status: "Ready", errorCode: null, canJoin: true });
      }
      if (url.endsWith("/meet/link")) {
        linkCalls += 1;
        return response(config, { url: MEET_URL });
      }
      throw new Error(`Unexpected request: ${config.method} ${url}`);
    };

    const client = new QueryClient();
    const root = mount(
      client,
      createElement(SessionMeetSection, { session: session(), role: "teacher" }),
    );
    await waitFor(() => text().includes("Tham gia Google Meet"));
    assert.equal(statusCalls, 1);
    assert.equal(linkCalls, 0, "opening a popover must not request the Meet link");
    assert.ok(!text().includes("meet.google.com"));

    await click(button("Tham gia Google Meet"), "join");
    await waitFor(() => navigated.length === 1);
    assert.deepEqual(opened, ["about:blank"]);
    assert.deepEqual(navigated, [MEET_URL]);
    assert.equal(linkCalls, 1);

    await click(button("Tham gia Google Meet"), "join again");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    assert.equal(linkCalls, 1, "a fresh cached link must not be requested again");
    assert.equal(navigated.length, 2);
    assert.ok(navigated.every((url) => url === MEET_URL));

    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("Student must not get a Meet action before canJoin; blocked popups fall back to a link", async () => {
  const { dom, window, server } = await harness();
  try {
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { SessionMeetSection } = await server.ssrLoadModule(
      "/src/modules/teacher/components/calendar/SessionMeetSection.tsx",
    );
    let canJoin = false;
    window.open = () => null;
    httpClient.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (url.endsWith("/meet/status")) {
        return response(config, { status: "Ready", errorCode: null, canJoin });
      }
      if (url.endsWith("/meet/link")) {
        return response(config, { url: MEET_URL });
      }
      throw new Error(`Unexpected request: ${config.method} ${url}`);
    };

    const client = new QueryClient();
    const root = mount(
      client,
      createElement(SessionMeetSection, { session: session(), role: "student" }),
    );
    await waitFor(() => text().includes("Phòng học chưa mở"));
    assert.equal(button("Tham gia Google Meet"), undefined);

    canJoin = true;
    await act(async () => {
      // Simulate the backend returning a different status after a refresh.
      await client.invalidateQueries({ queryKey: ["class-session-meet"] });
    });
    await waitFor(() => Boolean(button("Tham gia Google Meet")));
    await click(button("Tham gia Google Meet"), "join");
    await waitFor(() => text().includes("Trình duyệt đã chặn tab mới"));
    const fallback = dom.window.document.querySelector(
      "a[href='https://meet.google.com/abc-defg-hij']",
    );
    assert.ok(fallback, "authorized link should be offered after popup blocking");

    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("Meet link authorization failure is explained and never navigates", async () => {
  const { dom, window, server } = await harness();
  try {
    const { AxiosError } = await import("axios");
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { SessionMeetSection } = await server.ssrLoadModule(
      "/src/modules/teacher/components/calendar/SessionMeetSection.tsx",
    );
    let linkCalls = 0;
    let closed = 0;
    const navigated = [];
    window.open = () => ({
      opener: null,
      location: { replace: (value) => navigated.push(value) },
      close: () => {
        closed += 1;
      },
    });
    httpClient.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (url.endsWith("/meet/status")) {
        return response(config, { status: "Ready", errorCode: null, canJoin: true });
      }
      if (url.endsWith("/meet/link")) {
        linkCalls += 1;
        const failure = response(config, { code: "meet_link_unavailable" }, 403);
        throw new AxiosError("forbidden", "ERR_BAD_REQUEST", config, undefined, failure);
      }
      throw new Error(`Unexpected request: ${config.method} ${url}`);
    };

    const client = new QueryClient();
    const root = mount(
      client,
      createElement(SessionMeetSection, { session: session(), role: "teacher" }),
    );
    await waitFor(() => text().includes("Tham gia Google Meet"));
    await click(button("Tham gia Google Meet"), "join");
    await waitFor(() => text().includes("Liên kết phòng học hiện không khả dụng"));
    assert.equal(linkCalls, 1);
    assert.deepEqual(navigated, []);
    assert.equal(closed, 1);
    assert.ok(!text().includes("meet.google.com"));

    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("Admin can retry failed Meet provisioning and sees the refreshed status", async () => {
  const { dom, server } = await harness();
  try {
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { SessionMeetDialog } = await server.ssrLoadModule(
      "/src/modules/admin/components/SessionMeetDialog.tsx",
    );
    let meetStatus = "Failed";
    let retryCalls = 0;
    let statusCalls = 0;
    httpClient.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (config.method === "get" && url.endsWith("/meet/status")) {
        statusCalls += 1;
        return response(config, {
          status: meetStatus,
          errorCode: meetStatus === "Failed" ? "uncertain_google_result" : null,
          canJoin: false,
        });
      }
      if (config.method === "post" && url.endsWith("/meet/retry")) {
        retryCalls += 1;
        meetStatus = "Pending";
        return response(config, null, 202);
      }
      throw new Error(`Unexpected request: ${config.method} ${url}`);
    };

    const client = new QueryClient();
    const root = mount(
      client,
      createElement(SessionMeetDialog, { session: session(), onClose: () => {} }),
    );
    await waitFor(() => text().includes("Tạo phòng thất bại"));
    assert.ok(text().includes("Google chưa trả về kết quả chắc chắn"));
    await click(button("Thử lại tạo phòng"), "open retry confirmation");
    await waitFor(() => text().includes("Thử lại tạo phòng Google Meet?"));
    await click(dialogButton("Thử lại"), "confirm retry");
    await waitFor(() => text().includes("Đang chờ xử lý"));
    assert.equal(retryCalls, 1);
    assert.ok(statusCalls >= 2);

    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("Admin sees no retry action once Meet provisioning is ready", async () => {
  const { dom, server } = await harness();
  try {
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { SessionMeetDialog } = await server.ssrLoadModule(
      "/src/modules/admin/components/SessionMeetDialog.tsx",
    );
    httpClient.defaults.adapter = async (config) =>
      response(config, { status: "Ready", errorCode: null, canJoin: true });
    const client = new QueryClient();
    const root = mount(
      client,
      createElement(SessionMeetDialog, { session: session(), onClose: () => {} }),
    );
    await waitFor(() => text().includes("Sẵn sàng"));
    assert.equal(button("Thử lại tạo phòng"), undefined);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
