import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  DATE_POPOVER_HEIGHT,
  datePopoverPosition,
} from "../src/shared/components/DatePicker/datePopoverPosition.ts";

const anchor = (top, bottom, right = 400) => ({ top, bottom, right });

test("the date popover opens below the field when there is room", () => {
  assert.deepEqual(datePopoverPosition(anchor(100, 140), 800, 900), { top: 148, left: 80 });
});

test("the date popover flips above the field when the bottom is cramped", () => {
  assert.deepEqual(datePopoverPosition(anchor(500, 540), 800, 900), {
    top: 500 - DATE_POPOVER_HEIGHT - 8,
    left: 80,
  });
});

test("when neither side fits, the popover stays inside the viewport", () => {
  const { top, left } = datePopoverPosition(anchor(100, 140), 800, 400);
  assert.equal(top, 36);
  assert.equal(left, 80);
  assert.ok(top >= 12 && top + DATE_POPOVER_HEIGHT <= 400 - 12 + 1);
});

test("the date popover stays clear of the left and right edges", () => {
  assert.equal(datePopoverPosition(anchor(100, 140, 200), 800, 900).left, 12);
  assert.equal(datePopoverPosition(anchor(100, 140, 790), 800, 900).left, 468);
  assert.equal(datePopoverPosition(anchor(100, 140, 250), 300, 900).left, 12);
});

test("the popover can scroll instead of being cut off on short screens", () => {
  const css = readFileSync(
    new URL("../src/shared/components/DatePicker/DatePicker.module.css", import.meta.url),
    "utf8",
  );
  const popover = css.match(/\.popover\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(popover, /max-height:\s*calc\(100dvh - 24px\)/);
  assert.match(popover, /overflow-y:\s*auto/);
});
