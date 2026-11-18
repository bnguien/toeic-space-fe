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
const scheduleId = "44444444-4444-4444-8444-444444444444";
const fixture = {
  id: scheduleId,
  classId,
  daysOfWeek: [1, 3, 5],
  startTime: "18:00:00",
  endTime: "19:30:00",
  teacherId,
  mode: "Online",
  timeZoneId: "Asia/Ho_Chi_Minh",
  effectiveFrom: "2027-01-01",
  effectiveTo: "2027-01-31",
  excludeDates: [],
  createdAt: "2027-01-01T00:00:00.000Z",
  updatedAt: "2027-01-01T00:00:00.000Z",
  version: 2,
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
    cacheDir: "node_modules/.vite-admin-schedule-conflict-tests",
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

async function renderSchedules(server, schedules = []) {
  const [{ ClassSchedules }, { schedulesApi }, { classesApi }, { facilitiesApi }] =
    await Promise.all([
      server.ssrLoadModule("/src/modules/admin/components/ClassSchedules.tsx"),
      server.ssrLoadModule("/src/modules/admin/api/schedules.api.ts"),
      server.ssrLoadModule("/src/modules/admin/api/classes.api.ts"),
      server.ssrLoadModule("/src/modules/admin/api/facilities.api.ts"),
    ]);
  schedulesApi.list = async () => schedules;
  classesApi.teachers = async () => ({
    items: [{ id: teacherId, fullName: "Giáo viên thử", email: "teacher@example.com" }],
    page: 1,
    pageSize: 20,
    totalCount: 1,
  });
  facilitiesApi.getRoom = async () => ({
    id: roomId,
    name: "Phòng A1",
    centerId: "center-1",
    centerName: "Trung tâm",
    capacity: 20,
    status: "Active",
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(globalThis.document.getElementById("root"));
  act(() => {
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ClassSchedules, {
          classId,
          classStatus: "Active",
          defaultRoomId: roomId,
          classStartDate: "2027-01-01",
          classEndDate: "2027-03-31",
          assignedTeacherId: teacherId,
        }),
      ),
    );
  });
  await flush();
  return { root, schedulesApi };
}

test("recurring schedule creation previews all selected recurrence inputs before saving", async () => {
  const { dom, server } = await harness();
  try {
    const { root, schedulesApi } = await renderSchedules(server);
    let previews = 0;
    let saves = 0;
    schedulesApi.previewCreate = async (_classId, input) => {
      previews += 1;
      assert.deepEqual(input.daysOfWeek, [1, 3, 5]);
      assert.equal(input.timeZoneId, "Asia/Ho_Chi_Minh");
      assert.equal(input.effectiveFrom, "2027-01-01");
      return { affectedStudentCount: 3, conflictCount: 4, details: null };
    };
    schedulesApi.create = async () => {
      saves += 1;
      return fixture;
    };
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Thêm lịch định kỳ"),
      ),
      "open recurring schedule form",
    );
    const submit = () => globalThis.document.querySelector('button[form="schedule-form"]');
    await click(submit(), "preview recurring schedule");
    assert.ok(globalThis.document.body.textContent.includes("Cảnh báo trùng lịch học viên"));
    assert.equal(saves, 0);
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Quay lại chỉnh sửa"),
      ),
      "return to recurring schedule form",
    );
    assert.ok(globalThis.document.querySelector("#schedule-form"));
    await click(submit(), "preview recurring schedule again");
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Vẫn lưu lịch"),
      ),
      "save recurring schedule despite warning",
    );
    assert.equal(previews, 2);
    assert.equal(saves, 1);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("recurring schedule update previews with expected version and defers save until consent", async () => {
  const { dom, server } = await harness();
  try {
    const { root, schedulesApi } = await renderSchedules(server, [fixture]);
    let previews = 0;
    let saves = 0;
    schedulesApi.previewUpdate = async (_classId, id, input, version) => {
      previews += 1;
      assert.equal(id, scheduleId);
      assert.equal(version, fixture.version);
      assert.equal(input.timeZoneId, fixture.timeZoneId);
      return { affectedStudentCount: 2, conflictCount: 2, details: null };
    };
    schedulesApi.update = async () => {
      saves += 1;
      return { schedule: fixture, sessions: { affected: [], skipped: [] } };
    };
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Sửa lịch"),
      ),
      "open recurring schedule edit form",
    );
    const submit = () => globalThis.document.querySelector('button[form="schedule-form"]');
    await click(submit(), "preview recurring schedule update");
    assert.ok(globalThis.document.body.textContent.includes("Cảnh báo trùng lịch học viên"));
    assert.equal(saves, 0);
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Vẫn lưu lịch"),
      ),
      "confirm recurring schedule update",
    );
    assert.equal(previews, 1);
    assert.equal(saves, 1);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test("session generation previews the full selected date range before invoking generation", async () => {
  const { dom, server } = await harness();
  try {
    const { root, schedulesApi } = await renderSchedules(server);
    let previews = 0;
    let generations = 0;
    schedulesApi.previewGenerate = async (_classId, input) => {
      previews += 1;
      assert.deepEqual(input, { from: "2027-01-01", to: "2027-03-31" });
      return { affectedStudentCount: 5, conflictCount: 8, details: null };
    };
    schedulesApi.generate = async () => {
      generations += 1;
      return { affected: [], skipped: [] };
    };
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Sinh buổi học tự động"),
      ),
      "open generation form",
    );
    const submit = () => globalThis.document.querySelector('button[form="generate-form"]');
    await click(submit(), "preview session generation");
    assert.ok(globalThis.document.body.textContent.includes("Cảnh báo trùng lịch học viên"));
    assert.equal(generations, 0);
    await click(
      [...globalThis.document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("Vẫn lưu lịch"),
      ),
      "generate despite warning",
    );
    assert.equal(previews, 1);
    assert.equal(generations, 1);
    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
