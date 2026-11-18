import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  clampCourseSide,
  COURSE_SIDE_MAX,
  COURSE_SIDE_MIN,
  COURSE_SIDE_STORAGE_KEY,
  courseSideFromPointer,
  courseSideStyle,
  readCourseSide,
} from "../src/modules/courses/courseSidePanel.ts";

const storage = (raw) => ({
  getItem: (key) => (key === COURSE_SIDE_STORAGE_KEY ? raw : null),
});

test("the course sidebar width stays inside the draggable range", () => {
  assert.equal(clampCourseSide(120), COURSE_SIDE_MIN);
  assert.equal(clampCourseSide(9999), COURSE_SIDE_MAX);
  assert.equal(clampCourseSide(420.4), 420);
});

test("dragging past the snap point collapses the column and keeps its last width", () => {
  const current = { width: 400, collapsed: false };
  assert.deepEqual(courseSideFromPointer(200, current), { width: 400, collapsed: true });
  assert.deepEqual(courseSideFromPointer(260, current), {
    width: COURSE_SIDE_MIN,
    collapsed: false,
  });
  assert.deepEqual(courseSideFromPointer(560, current), { width: 560, collapsed: false });
  assert.deepEqual(courseSideFromPointer(900, current), {
    width: COURSE_SIDE_MAX,
    collapsed: false,
  });
});

test("the remembered width is read safely, clamped, and ignored when corrupt", () => {
  assert.deepEqual(readCourseSide(storage('{"width":500,"collapsed":true}')), {
    width: 500,
    collapsed: true,
  });
  assert.deepEqual(readCourseSide(storage('{"width":9999}')), {
    width: COURSE_SIDE_MAX,
    collapsed: false,
  });
  assert.deepEqual(readCourseSide(storage('{"width":"wide"}')), {
    width: null,
    collapsed: false,
  });
  assert.deepEqual(readCourseSide(storage("not json")), { width: null, collapsed: false });
  assert.deepEqual(readCourseSide(storage(null)), { width: null, collapsed: false });
});

test("the dragged width only applies while the column is open", () => {
  assert.deepEqual(courseSideStyle({ width: 460, collapsed: false }), {
    "--gp-side-w": "460px",
  });
  assert.equal(courseSideStyle({ width: null, collapsed: false }), undefined);
  assert.equal(courseSideStyle({ width: 460, collapsed: true }), undefined);
});

test("the course shell wires the draggable width into the grid, including mobile", () => {
  const css = readFileSync(
    new URL("../src/modules/courses/LearningPage.module.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.shell\.hasSideWidth\s*\{[^}]*var\(--gp-side-w\)/);
  assert.match(css, /\.shell\.dragging\s*\{[^}]*transition:\s*none/);
  assert.match(css, /\.split::before\s*\{[^}]*cursor:\s*col-resize/);
  assert.match(
    css,
    /@media \(max-width: 820px\) \{\s*\.shell,\s*\.shell\.hasSideWidth,\s*\.shell\.sideCollapsed\s*\{\s*grid-template-columns:\s*1fr;/,
  );
});

test("the lesson column paints a different surface from the curriculum sidebar", () => {
  const css = readFileSync(
    new URL("../src/modules/courses/LearningPage.module.css", import.meta.url),
    "utf8",
  );
  const rule = (selector) =>
    css.match(new RegExp(`^\\s*${selector}\\s*\\{([^}]*)\\}`, "m"))?.[1] ?? "";
  assert.match(rule("\\.side"), /background:\s*var\(--gp-surface,/);
  assert.match(rule("\\.main"), /background:\s*var\(--gp-reading,/);
  assert.match(css, /--gp-reading:\s*#f4f5f7/);
});
