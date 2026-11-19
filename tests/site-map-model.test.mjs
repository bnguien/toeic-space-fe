import assert from "node:assert/strict";
import test from "node:test";

import {
  PANEL_GROUP_KEYS,
  SITE_MAP,
  SITE_MAP_MAIN,
  canSee,
  countItems,
  currentItem,
  filterGroups,
  stripDiacritics,
  visibleGroups,
} from "../src/modules/landing/utils/siteMap.ts";
import { HOME_MAP, entriesFor, homeMapLinks } from "../src/modules/landing/utils/homeMap.ts";

const keys = (groups) => groups.flatMap((g) => g.items.map((i) => i.key));

test("site map items are unique and every panel group exists", () => {
  const all = keys(SITE_MAP);
  assert.equal(new Set(all).size, all.length, "item keys are unique");
  for (const key of PANEL_GROUP_KEYS)
    assert.ok(
      SITE_MAP.some((g) => g.key === key),
      key,
    );
  assert.equal(SITE_MAP_MAIN.length, 4);
  assert.ok(SITE_MAP.every((g) => g.items.every((i) => i.to.startsWith("/"))));
});

test("items follow the viewer's role", () => {
  const guest = keys(visibleGroups(SITE_MAP, null));
  assert.ok(guest.includes("login") && guest.includes("register"));
  assert.ok(!guest.includes("history") && !guest.includes("profile") && !guest.includes("admin"));

  const learner = keys(visibleGroups(SITE_MAP, "User"));
  assert.ok(
    learner.includes("history") && learner.includes("my-words") && learner.includes("profile"),
  );
  assert.ok(
    !learner.includes("login") && !learner.includes("admin") && !learner.includes("teacher"),
  );

  const teacher = keys(visibleGroups(SITE_MAP, "Teacher"));
  assert.ok(
    teacher.includes("teacher") && !teacher.includes("admin") && !teacher.includes("history"),
  );
  const admin = keys(visibleGroups(SITE_MAP, "Admin"));
  assert.ok(admin.includes("admin") && !admin.includes("my-courses"));

  assert.equal(canSee(undefined, null), true);
  assert.equal(countItems(visibleGroups(SITE_MAP, null)), guest.length);
});

test("search ignores Vietnamese diacritics and drops empty groups", () => {
  assert.equal(stripDiacritics("Nghe chép Đọc"), "nghe chep doc");
  const found = filterGroups(SITE_MAP, "nghe chep");
  assert.deepEqual(keys(found), ["dictation"]);
  assert.equal(filterGroups(SITE_MAP, "khong co gi ca xyz").length, 0);
  assert.equal(filterGroups(SITE_MAP, "  ").length, SITE_MAP.length);
});

test("current item: longest path, query parameters must match", () => {
  assert.equal(currentItem(SITE_MAP, "/practice/listening", "?part=3")?.key, "listening");
  assert.equal(currentItem(SITE_MAP, "/vocabulary", "?view=library")?.key, "my-words");
  assert.equal(currentItem(SITE_MAP, "/vocabulary", "")?.key, "vocabulary");
  assert.equal(currentItem(SITE_MAP, "/vocabulary/sets/abc", "")?.key, "vocabulary");
  assert.equal(currentItem(SITE_MAP, "/games/news/some-article", "")?.key, "news");
  assert.equal(currentItem(SITE_MAP, "/", ""), null);
});

test("home map: five tiles, role-aware popup entries", () => {
  assert.deepEqual(
    HOME_MAP.map((card) => card.title),
    ["Luyện Đề", "Luyện Nghe", "Luyện Đọc", "Từ Vựng", "Game"],
  );
  const exam = HOME_MAP[0];
  assert.ok(!entriesFor(exam, null).some((e) => e.to === "/practice/history"));
  assert.ok(entriesFor(exam, "User").some((e) => e.to === "/practice/history"));
  assert.deepEqual(
    entriesFor(HOME_MAP[1], null).map((e) => e.num),
    ["1", "2", "3", "4"],
  );
  assert.ok(homeMapLinks().every((to) => to.startsWith("/")));
});
