import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  isStudentConflictPreviewError,
  previewStudentConflictsBeforeSave,
} from "../src/shared/utils/student-conflicts.ts";

const noConflicts = { affectedStudentCount: 0, conflictCount: 0, details: null };
const preview = { affectedStudentCount: 17, conflictCount: 23, details: null };

test("no student conflicts continue through the existing save exactly once", async () => {
  const calls = [];
  const outcome = await previewStudentConflictsBeforeSave(
    async () => {
      calls.push("preview");
      return noConflicts;
    },
    async () => {
      calls.push("save");
      return "saved";
    },
  );

  assert.deepEqual(calls, ["preview", "save"]);
  assert.deepEqual(outcome, { kind: "saved", result: "saved" });
});

test("student conflicts defer the save until explicit confirmation and preserve both counts", async () => {
  let saves = 0;
  const outcome = await previewStudentConflictsBeforeSave(
    async () => preview,
    async () => {
      saves += 1;
      return "saved";
    },
  );

  assert.equal(outcome.kind, "warning");
  assert.equal(outcome.preview.affectedStudentCount, 17);
  assert.equal(outcome.preview.conflictCount, 23);
  assert.equal(saves, 0, "the save must remain deferred while the warning is open");
  assert.equal(await outcome.proceed(), "saved");
  assert.equal(saves, 1);
});

test("a failed preview never silently falls through to save and can be retried", async () => {
  let attempts = 0;
  let saves = 0;
  const previewRequest = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("offline");
    return noConflicts;
  };
  const save = async () => {
    saves += 1;
    return "saved";
  };

  await assert.rejects(
    previewStudentConflictsBeforeSave(previewRequest, save),
    (error) => isStudentConflictPreviewError(error) && error.cause.message === "offline",
  );
  assert.equal(saves, 0);
  assert.deepEqual(await previewStudentConflictsBeforeSave(previewRequest, save), {
    kind: "saved",
    result: "saved",
  });
  assert.equal(attempts, 2);
  assert.equal(saves, 1);
});

test("a regular save error remains a save error, not a preview error", async () => {
  const saveError = new Error("teacher/room conflict");
  await assert.rejects(
    previewStudentConflictsBeforeSave(
      async () => noConflicts,
      async () => {
        throw saveError;
      },
    ),
    (error) => error === saveError && !isStudentConflictPreviewError(error),
  );
});

test("Classroom preview clients use the distinct backend routes and request contracts", async () => {
  const server = await createServer({
    cacheDir: "node_modules/.vite-student-conflict-contract-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  try {
    const { httpClient } = await server.ssrLoadModule("/src/services/http/index.ts");
    const { sessionsApi } = await server.ssrLoadModule("/src/modules/admin/api/sessions.api.ts");
    const { schedulesApi } = await server.ssrLoadModule("/src/modules/admin/api/schedules.api.ts");
    const { enrollmentsApi } = await server.ssrLoadModule(
      "/src/modules/admin/api/enrollments.api.ts",
    );
    const { studentScheduleConflictsApi } = await server.ssrLoadModule(
      "/src/modules/admin/api/student-schedule-conflicts.api.ts",
    );
    const calls = [];
    const response = {
      affectedStudentCount: 0,
      conflictCount: 0,
      details: null,
    };
    httpClient.post = async (url, body, config) => {
      calls.push({ method: "post", url, body, config });
      return { data: response };
    };
    httpClient.get = async (url, config) => {
      calls.push({ method: "get", url, config });
      return { data: response };
    };

    const classId = "11111111-1111-4111-8111-111111111111";
    const sessionId = "22222222-2222-4222-8222-222222222222";
    const sessionInput = {
      classId,
      teacherId: "33333333-3333-4333-8333-333333333333",
      title: "Buổi bù",
      sessionType: "Makeup",
      startAt: "2027-01-01T09:00:00.000Z",
      endAt: "2027-01-01T10:00:00.000Z",
      mode: "Online",
      roomId: null,
      notes: null,
    };
    const sessionEdit = {
      teacherId: sessionInput.teacherId,
      title: sessionInput.title,
      startAt: sessionInput.startAt,
      endAt: sessionInput.endAt,
      mode: "Online",
      roomId: null,
      notes: null,
      reason: "Điều chỉnh lịch",
      expectedVersion: 4,
    };
    const scheduleInput = {
      classId,
      daysOfWeek: [1, 3, 5],
      startTime: "18:00:00",
      endTime: "19:30:00",
      teacherId: sessionInput.teacherId,
      mode: "Online",
      timeZoneId: "Asia/Ho_Chi_Minh",
      effectiveFrom: "2027-01-01",
      effectiveTo: "2027-03-31",
      excludeDates: ["2027-02-10"],
    };
    const generation = { from: "2027-01-01", to: "2027-01-31", excludeDates: ["2027-01-15"] };

    await sessionsApi.previewCreate(sessionInput);
    await sessionsApi.previewUpdate(sessionId, sessionEdit);
    await schedulesApi.previewCreate(classId, scheduleInput);
    await schedulesApi.previewUpdate(classId, sessionId, scheduleInput, 7);
    await schedulesApi.previewGenerate(classId, generation);
    await enrollmentsApi.preview(classId, ["44444444-4444-4444-8444-444444444444"]);
    await studentScheduleConflictsApi.check("2027-01-01T00:00:00.000Z", "2027-01-08T00:00:00.000Z");

    assert.deepEqual(
      calls.map(({ method, url }) => [method, url]),
      [
        ["post", "/classroom/api/v1/class-sessions/conflicts/preview"],
        ["post", `/classroom/api/v1/class-sessions/${sessionId}/conflicts/preview`],
        ["post", `/classroom/api/v1/classes/${classId}/schedules/conflicts/preview`],
        ["post", `/classroom/api/v1/classes/${classId}/schedules/${sessionId}/conflicts/preview`],
        ["post", `/classroom/api/v1/classes/${classId}/schedules/generate/conflicts/preview`],
        ["post", `/classroom/api/v1/classes/${classId}/enrollments/conflicts/preview`],
        ["get", "/classroom/api/v1/students/me/schedule-conflicts"],
      ],
    );
    assert.deepEqual(calls[0].body, sessionInput);
    assert.deepEqual(calls[1].body, sessionEdit);
    assert.deepEqual(calls[2].body, scheduleInput);
    assert.deepEqual(calls[3].body, { input: scheduleInput, expectedVersion: 7 });
    assert.deepEqual(calls[4].body, generation);
    assert.deepEqual(calls[5].body, {
      studentIds: ["44444444-4444-4444-8444-444444444444"],
    });
    assert.deepEqual(calls[6].config.params, {
      from: "2027-01-01T00:00:00.000Z",
      to: "2027-01-08T00:00:00.000Z",
      detailsPage: 1,
      detailsPageSize: 100,
    });
  } finally {
    await server.close();
  }
});

test("student calendar checks conflicts on demand, highlights sessions, and clears results on week change", async () => {
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
    cacheDir: "node_modules/.vite-student-conflict-calendar-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const flush = async () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
  try {
    const { ClassScheduleCalendar } = await server.ssrLoadModule(
      "/src/modules/teacher/components/ClassScheduleCalendar.tsx",
    );
    const { studentScheduleConflictsApi, sessionsApi } = await server.ssrLoadModule(
      "/src/modules/admin/index.ts",
    );
    const calendarTime = await server.ssrLoadModule(
      "/src/modules/teacher/components/calendar/calendarTime.ts",
    );
    const weekStart = calendarTime.startOfIctWeek();
    const from = calendarTime.wallToIso(weekStart);
    const to = calendarTime.wallToIso(calendarTime.addWallDays(weekStart, 7));
    const firstId = "22222222-2222-4222-8222-222222222222";
    const secondId = "33333333-3333-4333-8333-333333333333";
    const firstStart = new Date(new Date(from).getTime() + 42 * 60 * 60 * 1000).toISOString();
    const firstEnd = new Date(new Date(firstStart).getTime() + 2 * 60 * 60 * 1000).toISOString();
    const secondStart = new Date(new Date(firstStart).getTime() + 60 * 60 * 1000).toISOString();
    const secondEnd = new Date(new Date(secondStart).getTime() + 90 * 60 * 1000).toISOString();
    const classA = "11111111-1111-4111-8111-111111111111";
    const classB = "44444444-4444-4444-8444-444444444444";
    const emptyPage = { items: [], page: 1, pageSize: 100, totalCount: 0 };
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(["calendar", "class-sessions", "student", from, to], {
      items: [
        {
          id: firstId,
          classId: classA,
          title: "Speaking",
          teacherId: "t1",
          startAt: firstStart,
          endAt: firstEnd,
          mode: "Online",
          status: "Scheduled",
        },
        {
          id: secondId,
          classId: classB,
          title: "Reading",
          teacherId: "t2",
          startAt: secondStart,
          endAt: secondEnd,
          mode: "Online",
          status: "Scheduled",
        },
      ],
      page: 1,
      pageSize: 100,
      totalCount: 2,
    });
    sessionsApi.list = async () => emptyPage;
    let checks = 0;
    studentScheduleConflictsApi.check = async (rangeFrom, rangeTo) => {
      checks += 1;
      assert.equal(rangeFrom, from);
      assert.equal(rangeTo, to);
      return {
        affectedStudentCount: 1,
        conflictCount: 1,
        details: {
          items: [
            {
              studentId: "private-student-id",
              first: { sessionId: firstId, classId: classA, startAt: firstStart, endAt: firstEnd },
              second: {
                sessionId: secondId,
                classId: classB,
                startAt: secondStart,
                endAt: secondEnd,
              },
              overlapStart: secondStart,
              overlapEnd: firstEnd,
            },
          ],
          page: 1,
          pageSize: 100,
          totalCount: 1,
        },
      };
    };
    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(ClassScheduleCalendar, {
            role: "student",
            classNames: new Map([
              [classA, "TOEIC Speaking"],
              [classB, "TOEIC Reading"],
            ]),
          }),
        ),
      );
    });
    await flush();
    assert.equal(checks, 0, "conflict checks must not run automatically");

    const click = async (node, label) => {
      assert.ok(node, `missing ${label}`);
      await act(async () => node.click());
      await flush();
    };
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Kiểm tra trùng lịch"),
      ),
      "on-demand conflict check",
    );
    assert.equal(checks, 1);
    assert.ok(globalThis.document.body.textContent.includes("TOEIC Speaking"));
    assert.ok(globalThis.document.body.textContent.includes("TOEIC Reading"));
    assert.ok(globalThis.document.querySelector(`[data-calendar-event][data-conflict="true"]`));
    assert.equal(globalThis.document.body.textContent.includes("private-student-id"), false);

    await click(globalThis.document.querySelector('button[aria-label="Tuần sau"]'), "next week");
    assert.equal(checks, 1, "week navigation must not make another conflict request");
    assert.equal(globalThis.document.body.textContent.includes("TOEIC Speaking"), false);
    assert.equal(
      globalThis.document.querySelector('[data-calendar-event][data-conflict="true"]'),
      null,
    );
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("admin enrollment previews selected students, preserves selection on Back, and proceeds on consent", async () => {
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
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.removeAttribute("open");
  };
  const server = await createServer({
    cacheDir: "node_modules/.vite-student-conflict-enrollment-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const flush = async () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
  try {
    const { StudentEnrollmentDialog } = await server.ssrLoadModule(
      "/src/modules/admin/components/StudentEnrollmentDialog.tsx",
    );
    const { useAuthStore } = await server.ssrLoadModule("/src/modules/auth/index.ts");
    useAuthStore.setState({
      status: "authenticated",
      user: {
        id: "99999999-9999-4999-8999-999999999999",
        fullName: "Admin",
        email: "admin@example.com",
        role: "Admin",
        avatarUrl: null,
      },
      accessToken: "test-token",
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(["eligible-students", "", 1], {
      items: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          fullName: "Nguyễn An",
          email: "an@example.com",
          avatarUrl: null,
          status: "Active",
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });
    let previewCalls = 0;
    let enrollCalls = 0;
    let closed = false;
    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(StudentEnrollmentDialog, {
            pending: false,
            error: null,
            onClose: () => {
              closed = true;
            },
            onResetError: () => {},
            onPreviewEnroll: async () => {
              previewCalls += 1;
              return { affectedStudentCount: 1, conflictCount: 2, details: null };
            },
            onEnroll: async () => {
              enrollCalls += 1;
              return {
                totalCount: 1,
                enrolledCount: 1,
                failedCount: 0,
                items: [
                  {
                    index: 0,
                    studentId: "44444444-4444-4444-8444-444444444444",
                    enrollmentId: "55555555-5555-4555-8555-555555555555",
                    code: null,
                    message: null,
                  },
                ],
              };
            },
          }),
        ),
      );
    });
    await flush();
    const click = async (node, label) => {
      assert.ok(node, `missing ${label}`);
      await act(async () => node.click());
      await flush();
    };
    const checkbox = globalThis.document.querySelector('input[aria-label="Chọn Nguyễn An"]');
    assert.ok(checkbox, globalThis.document.body.textContent);
    await click(checkbox, "select student");
    const submit = () =>
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Xác nhận thêm (1)"),
      );
    await click(submit(), "preview enrollment");
    assert.ok(globalThis.document.body.textContent.includes("Cảnh báo trùng lịch học viên"));
    assert.equal(enrollCalls, 0);
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Quay lại chỉnh sửa"),
      ),
      "back to student selection",
    );
    assert.ok(globalThis.document.body.textContent.includes("Đã chọn 1 học viên"));
    assert.equal(enrollCalls, 0);
    await click(submit(), "preview enrollment again");
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Vẫn thêm học viên"),
      ),
      "enroll despite warning",
    );
    assert.equal(previewCalls, 2);
    assert.equal(enrollCalls, 1);
    assert.equal(closed, true);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
