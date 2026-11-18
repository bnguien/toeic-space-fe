import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { curriculumBackPath, firstLessonPath } from "../src/modules/courses/lessonRoutes.ts";

const modules = [
  {
    id: "m2",
    title: "Module 2",
    sortOrder: 2,
    lessons: [{ id: "lesson-b", title: "B", sortOrder: 1 }],
  },
  {
    id: "m1",
    title: "Module 1",
    sortOrder: 1,
    lessons: [
      { id: "lesson-z", title: "Z", sortOrder: 2 },
      { id: "lesson-a", title: "A", sortOrder: 1 },
    ],
  },
];

test("opening a course targets the first lesson in curriculum order", () => {
  assert.equal(firstLessonPath("course-1", modules), "/my-courses/course-1/lessons/lesson-a");
  assert.equal(firstLessonPath("course-1", []), null);
  assert.equal(
    firstLessonPath("course-1", [{ id: "empty", title: "Empty", sortOrder: 1, lessons: [] }]),
    null,
  );
});

test("curriculum back link returns to my courses only when the learner owns the course", () => {
  assert.equal(curriculumBackPath(true, "course-1"), "/my-courses");
  assert.equal(curriculumBackPath(true, "course-1", "?from=preview"), "/my-courses");
  assert.equal(curriculumBackPath(false, "course-1"), "/courses/course-1");
  assert.equal(
    curriculumBackPath(false, "course-1", "?from=preview"),
    "/courses/course-1?from=preview",
  );
});

test("collapsing the curriculum sidebar keeps the main lesson column in its grid cell", () => {
  const css = readFileSync(
    new URL("../src/modules/courses/LearningPage.module.css", import.meta.url),
    "utf8",
  );
  const collapsedRule = css.match(/\.shell\.sideCollapsed \.side \{([^}]*)\}/);
  assert.ok(collapsedRule, "missing collapsed sidebar rule");
  assert.doesNotMatch(collapsedRule[1], /display:\s*none/);
  assert.match(collapsedRule[1], /visibility:\s*hidden/);
});
