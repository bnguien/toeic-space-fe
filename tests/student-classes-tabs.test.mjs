import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { createServer } from "vite";

const flush = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });

test("Student Classes tabs default to Calendar, sync query params, and only mount the active tab", async () => {
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
  const server = await createServer({
    cacheDir: "node_modules/.vite-student-classes-tabs-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  try {
    const { StudentClassesPage } = await server.ssrLoadModule(
      "/src/modules/student/pages/StudentClassesPage.tsx",
    );
    const { studentClassesApi } = await server.ssrLoadModule(
      "/src/modules/student/api/student-classes.api.ts",
    );
    const { attendanceApi } = await server.ssrLoadModule(
      "/src/modules/teacher/api/attendance.api.ts",
    );
    const { sessionsApi } = await server.ssrLoadModule("/src/modules/admin/api/sessions.api.ts");
    const classRequests = [];
    let attendanceRequests = 0;
    const sampleClass = {
      id: "11111111-1111-4111-8111-111111111111",
      code: "TOEIC-4",
      name: "TOEIC 4 kỹ năng",
      description: null,
      status: "Active",
      startDate: "2026-11-01",
      endDate: "2027-02-01",
      teacherId: "22222222-2222-4222-8222-222222222222",
      teacherName: "Giáo viên mẫu",
    };
    studentClassesApi.list = async (filters) => {
      classRequests.push(filters);
      const items = filters.pageSize === 20 ? [sampleClass] : [];
      return { items, page: filters.page, pageSize: filters.pageSize, totalCount: items.length };
    };
    attendanceApi.mine = async () => {
      attendanceRequests += 1;
      return [];
    };
    sessionsApi.list = async () => ({ items: [], page: 1, pageSize: 100, totalCount: 0 });

    function LocationProbe() {
      const location = useLocation();
      return createElement("output", { id: "location-search" }, location.search);
    }

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ["/my-classes"] },
          createElement(
            QueryClientProvider,
            { client },
            createElement(LocationProbe),
            createElement(StudentClassesPage),
          ),
        ),
      );
    });
    await flush();

    assert.ok(globalThis.document.body.textContent.includes("Không gian học tập"));
    assert.ok(globalThis.document.body.textContent.includes("Lớp học của tôi"));
    assert.ok(globalThis.document.body.textContent.includes("Lịch học theo tuần"));
    assert.equal(globalThis.document.querySelector('input[aria-label="Tìm lớp học"]'), null);
    assert.equal(attendanceRequests, 0, "attendance must not load on the Calendar tab");
    assert.ok(classRequests.every((filters) => filters.pageSize !== 20));

    const click = async (node, label) => {
      assert.ok(node, `missing ${label}`);
      await act(async () => node.click());
      await flush();
    };
    await click(
      [...globalThis.document.querySelectorAll('[role="tab"]')].find((node) =>
        node.textContent.includes("Lớp học của tôi"),
      ),
      "classes tab",
    );
    assert.ok(globalThis.document.querySelector('input[aria-label="Tìm lớp học"]'));
    assert.equal(globalThis.document.body.textContent.includes("Lịch học theo tuần"), false);
    assert.ok(globalThis.document.body.textContent.includes("TOEIC 4 kỹ năng"));
    assert.ok(globalThis.document.body.textContent.includes("Giáo viên mẫu"));
    assert.ok(globalThis.document.body.textContent.includes("Đang hoạt động"));
    assert.equal(
      globalThis.document
        .querySelector('a[aria-label="Xem chi tiết lớp TOEIC 4 kỹ năng"]')
        ?.getAttribute("href"),
      "/my-classes/11111111-1111-4111-8111-111111111111?tab=classes",
    );
    assert.ok(
      globalThis.document.querySelector("#location-search").textContent.includes("tab=classes"),
    );
    assert.ok(classRequests.some((filters) => filters.pageSize === 20));
    assert.equal(attendanceRequests, 0);

    await click(
      [...globalThis.document.querySelectorAll('[role="tab"]')].find((node) =>
        node.textContent.includes("Lịch sử điểm danh"),
      ),
      "attendance tab",
    );
    assert.ok(globalThis.document.body.textContent.includes("Chưa có bản ghi điểm danh"));
    assert.equal(globalThis.document.querySelector('input[aria-label="Tìm lớp học"]'), null);
    assert.ok(
      globalThis.document.querySelector("#location-search").textContent.includes("tab=attendance"),
    );
    assert.ok(attendanceRequests > 0);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("a Student can open the corresponding class details from a Calendar session", async () => {
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
  const server = await createServer({
    cacheDir: "node_modules/.vite-student-calendar-class-details-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  try {
    const { StudentClassesPage } = await server.ssrLoadModule(
      "/src/modules/student/pages/StudentClassesPage.tsx",
    );
    const { studentClassesApi } = await server.ssrLoadModule(
      "/src/modules/student/api/student-classes.api.ts",
    );
    const { sessionsApi } = await server.ssrLoadModule("/src/modules/admin/api/sessions.api.ts");
    const { startOfIctWeek, wallToIso } = await server.ssrLoadModule(
      "/src/modules/teacher/components/calendar/calendarTime.ts",
    );
    const classId = "11111111-1111-4111-8111-111111111111";
    const teacherId = "22222222-2222-4222-8222-222222222222";
    const roomId = "33333333-3333-4333-8333-333333333333";
    const classroom = {
      id: classId,
      code: "TOEIC-4",
      name: "TOEIC 4 kỹ năng",
      description: "Lớp luyện thi TOEIC.",
      status: "Active",
      startDate: "2026-11-01",
      endDate: "2027-02-01",
      teacherId,
      teacherName: "Giáo viên thử",
    };
    const weekStart = startOfIctWeek();
    const dayAtNine = new Date(weekStart);
    dayAtNine.setUTCHours(9, 0, 0, 0);
    const startAt = wallToIso(dayAtNine);
    const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
    studentClassesApi.list = async (filters) => ({
      items: [classroom],
      page: filters.page,
      pageSize: filters.pageSize,
      totalCount: 1,
    });
    studentClassesApi.detail = async () => ({ class: classroom, instructorHistory: [] });
    sessionsApi.list = async () => ({
      items: [
        {
          id: "session-calendar-detail",
          classId,
          teacherId,
          title: "Buổi luyện TOEIC",
          sessionType: "Regular",
          startAt,
          endAt,
          mode: "Offline",
          roomId,
          roomName: "Phòng A1",
          status: "Scheduled",
          version: 1,
        },
      ],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ["/my-classes?tab=calendar"] },
          createElement(
            QueryClientProvider,
            { client },
            createElement(
              Routes,
              null,
              createElement(Route, {
                path: "/my-classes",
                element: createElement(StudentClassesPage),
              }),
              createElement(Route, {
                path: "/my-classes/:id",
                element: createElement(StudentClassesPage),
              }),
            ),
          ),
        ),
      );
    });
    await flush();
    const click = async (node, label) => {
      assert.ok(node, `missing ${label}`);
      await act(async () => node.click());
      await flush();
    };
    await click(
      globalThis.document.querySelector("button[data-calendar-event]"),
      "calendar session",
    );
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Xem chi tiết lớp"),
      ),
      "open class details",
    );
    await flush();
    assert.ok(globalThis.document.body.textContent.includes("TOEIC 4 kỹ năng"));
    assert.ok(globalThis.document.body.textContent.includes("TOEIC-4"));
    assert.ok(globalThis.document.body.textContent.includes("← Quay lại danh sách"));
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
