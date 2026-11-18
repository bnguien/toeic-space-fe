import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  addWallDays,
  startOfIctWeek,
  wallToIso,
} from "../src/modules/teacher/components/calendar/calendarTime.ts";

const HOUR = 60 * 60 * 1000;
const classId = "11111111-1111-1111-1111-111111111111";

const session = (overrides = {}) => ({
  id: "22222222-2222-2222-2222-222222222222",
  classId,
  teacherId: "33333333-3333-3333-3333-333333333333",
  title: "Luyện Listening Part 3",
  description: null,
  startAt: "2026-11-17T02:00:00.000Z",
  endAt: "2026-11-17T03:00:00.000Z",
  mode: "Online",
  roomId: null,
  roomName: null,
  centerName: null,
  status: "Scheduled",
  cancellationReason: null,
  version: 1,
  ...overrides,
});

const wrap = (client, element) => createElement(QueryClientProvider, { client }, element);

const render = (client, element) => renderToStaticMarkup(wrap(client, element));

const weekStart = startOfIctWeek();
const from = wallToIso(weekStart);
const to = wallToIso(addWallDays(weekStart, 7));
// Monday 00:00 ICT inside the rendered week, converted back to a UTC instant.
const mondayIct = new Date(weekStart.getTime() - 7 * HOUR);
const at = (hours) => new Date(mondayIct.getTime() + hours * HOUR).toISOString();

test("calendar renders the backend week with ICT times and status indicators", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { ClassScheduleCalendar } = await server.ssrLoadModule(
      "/src/modules/teacher/components/ClassScheduleCalendar.tsx",
    );
    const client = new QueryClient();
    client.setQueryData(["calendar", "class-sessions", "teacher", from, to], {
      items: [
        session({ id: "s-online", startAt: at(9), endAt: at(10.5) }),
        session({
          id: "s-offline",
          title: "Mock Test",
          mode: "Offline",
          roomName: "Phòng 201",
          centerName: "Quận 1",
          startAt: at(13),
          endAt: at(15),
        }),
        session({
          id: "s-done",
          title: "Review",
          status: "Completed",
          startAt: at(16),
          endAt: at(17),
        }),
        session({
          id: "s-cancelled",
          title: "Speaking",
          status: "Cancelled",
          cancellationReason: "Giáo viên bận",
          startAt: at(18),
          endAt: at(19),
        }),
      ],
      page: 1,
      pageSize: 100,
      totalCount: 4,
    });

    const html = render(
      client,
      createElement(ClassScheduleCalendar, {
        role: "teacher",
        classNames: new Map([[classId, "TOEIC MASTER 800+"]]),
      }),
    );

    for (const day of ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]) {
      assert.ok(html.includes(day), `missing day header ${day}`);
    }
    assert.ok(html.includes("GMT+07:00"));
    assert.ok(html.includes("TOEIC MASTER 800+"));
    assert.ok(html.includes("09:00") && html.includes("10:30"));
    assert.ok(html.includes("trực tuyến"));
    assert.ok(html.includes("trực tiếp"));
    assert.ok(html.includes("đã hoàn thành"));
    assert.ok(html.includes("đã hủy"));
    assert.ok(html.includes("Lịch học theo tuần"));
  } finally {
    await server.close();
  }
});

test("calendar shows an empty state instead of fake sessions", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { ClassScheduleCalendar } = await server.ssrLoadModule(
      "/src/modules/teacher/components/ClassScheduleCalendar.tsx",
    );
    const client = new QueryClient();
    client.setQueryData(["calendar", "class-sessions", "student", from, to], {
      items: [],
      page: 1,
      pageSize: 100,
      totalCount: 0,
    });
    const html = render(
      client,
      createElement(ClassScheduleCalendar, {
        role: "student",
        classNames: new Map(),
      }),
    );
    assert.ok(html.includes("Chưa có buổi học trong tuần này"));
  } finally {
    await server.close();
  }
});

test("student calendar hides cancelled sessions while the calendar remains available to teachers", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { ClassScheduleCalendar } = await server.ssrLoadModule(
      "/src/modules/teacher/components/ClassScheduleCalendar.tsx",
    );
    const client = new QueryClient();
    const cancelled = session({
      id: "student-cancelled",
      title: "Cancelled speaking",
      status: "Cancelled",
    });
    client.setQueryData(["calendar", "class-sessions", "student", from, to], {
      items: [cancelled],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    });
    const studentHtml = render(
      client,
      createElement(ClassScheduleCalendar, {
        role: "student",
        classNames: new Map([[classId, "TOEIC Speaking"]]),
      }),
    );
    assert.ok(studentHtml.includes("Chưa có buổi học trong tuần này"));
    assert.equal(studentHtml.includes("Cancelled speaking"), false);

    const teacherClient = new QueryClient();
    teacherClient.setQueryData(["calendar", "class-sessions", "teacher", from, to], {
      items: [cancelled],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    });
    const teacherHtml = render(
      teacherClient,
      createElement(ClassScheduleCalendar, {
        role: "teacher",
        classNames: new Map([[classId, "TOEIC Speaking"]]),
      }),
    );
    assert.ok(teacherHtml.includes("Cancelled speaking"));
  } finally {
    await server.close();
  }
});

test("popover exposes a Meet join action only when the backend reports canJoin", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { SessionSchedulePopover } = await server.ssrLoadModule(
      "/src/modules/teacher/components/calendar/SessionSchedulePopover.tsx",
    );
    const renderPopover = (id, status, role = "student", overrides = {}) => {
      const client = new QueryClient();
      client.setQueryData(["class-session-meet", id], status);
      // A cached link must not be rendered before the user attempts to join.
      client.setQueryData(["class-session-meet-link", id], {
        url: "https://meet.google.com/abc-defg-hij",
      });
      return render(
        client,
        createElement(SessionSchedulePopover, {
          session: session({ id, ...overrides }),
          classLabel: "TOEIC MASTER 800+",
          teacherName: "Nguyễn Văn A",
          role,
          anchor: {},
          focusOnMount: false,
          onRequestClose: () => {},
          onKeepOpen: () => {},
          onRelease: () => {},
        }),
      );
    };

    const ready = renderPopover("meet-ready", {
      status: "Ready",
      errorCode: null,
      canJoin: true,
    });
    assert.ok(ready.includes("Tham gia Google Meet"));
    assert.ok(!ready.includes("meet.google.com"));
    assert.ok(ready.includes("TOEIC MASTER 800+"));
    assert.ok(ready.includes("Nguyễn Văn A"));
    assert.ok(ready.includes("Trực tuyến"));

    const closed = renderPopover("meet-closed", {
      status: "Ready",
      errorCode: null,
      canJoin: false,
    });
    assert.ok(!closed.includes("meet.google.com"));
    assert.ok(!closed.includes("Tham gia Google Meet"));
    assert.ok(closed.includes("Phòng học chưa mở"));

    const pending = renderPopover("meet-pending", {
      status: "Pending",
      errorCode: null,
      canJoin: false,
    });
    assert.ok(pending.includes("Đang chờ hệ thống chuẩn bị phòng học"));

    const provisioning = renderPopover("meet-provisioning", {
      status: "Provisioning",
      errorCode: null,
      canJoin: false,
    });
    assert.ok(provisioning.includes("Đang tạo phòng Google Meet"));

    const failed = renderPopover(
      "meet-failed",
      { status: "Failed", errorCode: "uncertain_google_result", canJoin: false },
      "teacher",
    );
    assert.ok(failed.includes("Không thể tạo phòng học trực tuyến"));
    assert.ok(failed.includes("Google chưa trả về kết quả chắc chắn"));

    const needsConnection = renderPopover(
      "meet-connection",
      { status: "NeedsConnection", errorCode: null, canJoin: false },
      "teacher",
    );
    assert.ok(!needsConnection.includes("meet.google.com"));
    assert.ok(needsConnection.includes("Bạn cần kết nối Google Meet"));

    const studentConnection = renderPopover(
      "meet-student-connection",
      { status: "NeedsConnection", errorCode: null, canJoin: false },
      "student",
    );
    assert.ok(studentConnection.includes("Phòng học trực tuyến chưa sẵn sàng"));
    assert.ok(!studentConnection.includes("Giáo viên chưa kết nối"));

    const cancelled = renderPopover(
      "meet-cancelled",
      { status: "Inactive", errorCode: null, canJoin: false },
      "student",
      { status: "Cancelled" },
    );
    assert.ok(!cancelled.includes("Google Meet"));
    assert.ok(!cancelled.includes("meet.google.com"));
  } finally {
    await server.close();
  }
});

test("offline popover shows room and center instead of a Meet action", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { SessionSchedulePopover } = await server.ssrLoadModule(
      "/src/modules/teacher/components/calendar/SessionSchedulePopover.tsx",
    );
    const client = new QueryClient();
    const html = render(
      client,
      createElement(SessionSchedulePopover, {
        session: session({
          mode: "Offline",
          roomName: "Phòng 201",
          centerName: "Quận 1",
        }),
        classLabel: "TOEIC BOOST 750+",
        role: "student",
        anchor: {},
        focusOnMount: false,
        onRequestClose: () => {},
        onKeepOpen: () => {},
        onRelease: () => {},
      }),
    );
    assert.ok(html.includes("Phòng 201"));
    assert.ok(html.includes("Quận 1"));
    assert.ok(html.includes("Trực tiếp"));
    assert.ok(!html.includes("Google Meet"));
  } finally {
    await server.close();
  }
});
