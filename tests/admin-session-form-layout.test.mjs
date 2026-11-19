import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/modules/admin/components/ClassSessions.module.css", import.meta.url),
  "utf8",
);

const rule = (selector) =>
  css.match(new RegExp(`^\\s*${selector}\\s*\\{([^}]*)\\}`, "m"))?.[1] ?? "";

test("two-column session form rows stay equal when a select holds a long option label", () => {
  assert.match(rule("\\.formRow2"), /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
});

test("session form fields may shrink inside their grid column", () => {
  assert.match(rule("\\.formField"), /min-width:\s*0/);
});
