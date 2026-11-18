import test from "node:test";
import assert from "node:assert/strict";
import {
  classTone,
  formatIctTime,
  ictDateIndex,
  ictTodayKey,
  layoutDaySessions,
  startOfIctWeek,
  visibleHourRange,
  wallDateKey,
  wallToIso,
  weekdayTone,
} from "../src/modules/teacher/components/calendar/calendarTime.ts";

const session = (id, startAt, endAt) => ({
  id,
  classId: "class-a",
  title: id,
  startAt,
  endAt,
  mode: "Online",
  status: "Scheduled",
});

test("week math runs on Asia/Ho_Chi_Minh wall clock", () => {
  // Tuesday 2026-11-17 10:00 ICT.
  const reference = new Date("2026-11-17T03:00:00.000Z");
  const monday = startOfIctWeek(reference);
  assert.equal(wallDateKey(monday), "2026-11-16");
  // Monday 00:00 ICT is Sunday 17:00 UTC.
  assert.equal(wallToIso(monday), "2026-11-15T17:00:00.000Z");
});

test("ICT date keys roll over at ICT midnight, not UTC midnight", () => {
  // Monday 2026-11-16 17:30 UTC is Tuesday 00:30 ICT.
  assert.equal(ictTodayKey(new Date("2026-11-16T17:30:00.000Z")), "2026-11-17");
  const monday = startOfIctWeek(new Date("2026-11-17T03:00:00.000Z"));
  assert.equal(ictDateIndex("2026-11-22T16:59:00.000Z", monday), 6);
  assert.equal(ictDateIndex("2026-11-22T17:00:00.000Z", monday), null);
});

test("session times render in ICT", () => {
  assert.equal(formatIctTime("2026-11-17T02:30:00.000Z"), "09:30");
});

test("overlapping sessions split into equal columns and later sessions stay full width", () => {
  const positions = layoutDaySessions(
    [
      session("first", "2026-11-17T02:00:00.000Z", "2026-11-17T03:00:00.000Z"),
      session("second", "2026-11-17T02:30:00.000Z", "2026-11-17T03:30:00.000Z"),
      session("later", "2026-11-17T04:00:00.000Z", "2026-11-17T05:00:00.000Z"),
    ],
    7,
  );

  const byId = Object.fromEntries(positions.map((entry) => [entry.session.id, entry]));
  assert.deepEqual([byId.first.left, byId.first.width], ["0%", "50%"]);
  assert.deepEqual([byId.second.left, byId.second.width], ["50%", "50%"]);
  assert.equal(byId.first.height, 53);
  assert.deepEqual([byId.later.left, byId.later.width], ["0%", "100%"]);
  assert.equal(byId.later.top, 224);
});

test("visible hour range expands for early and late sessions", () => {
  assert.deepEqual(visibleHourRange([]), { startHour: 7, endHour: 21 });
  const range = visibleHourRange([
    session("early", "2026-11-17T23:30:00.000Z", "2026-11-18T00:30:00.000Z"),
    session("late", "2026-11-17T13:00:00.000Z", "2026-11-17T14:30:00.000Z"),
  ]);
  assert.deepEqual(range, { startHour: 6, endHour: 22 });
});

test("class colors stay stable per class", () => {
  assert.deepEqual(classTone("class-a"), classTone("class-a"));
  assert.match(classTone("class-a").background, /^#[0-9a-f]{6}$/);
});

test("each weekday gets its own pastel color", () => {
  const tones = Array.from({ length: 7 }, (_, index) => weekdayTone(index));
  assert.equal(new Set(tones.map((tone) => tone.background)).size, 7);
  assert.ok(tones.every((tone) => /^#[0-9a-f]{6}$/.test(tone.background)));
  assert.deepEqual(weekdayTone(7), weekdayTone(0));
});
