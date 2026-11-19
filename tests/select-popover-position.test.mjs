import assert from "node:assert/strict";
import test from "node:test";

import { selectPopoverPosition } from "../src/shared/components/Select/selectPopoverPosition.ts";

const anchor = (top, bottom, left = 100, width = 300) => ({ top, bottom, left, width });

test("the select menu opens below the trigger when the modal has room", () => {
  assert.deepEqual(selectPopoverPosition(anchor(100, 140), 800, 900), {
    left: 100,
    width: 300,
    maxHeight: 260,
    top: 146,
    bottom: "auto",
  });
});

test("the select menu flips above the trigger near the bottom of a scrolling modal", () => {
  assert.deepEqual(selectPopoverPosition(anchor(600, 640), 800, 700), {
    left: 100,
    width: 300,
    maxHeight: 260,
    top: "auto",
    bottom: 106,
  });
});

test("the select menu stays inside narrow viewports and their side gutters", () => {
  assert.equal(selectPopoverPosition(anchor(100, 140, 700), 800, 900).left, 488);
  const narrow = selectPopoverPosition(anchor(100, 140, 100, 400), 300, 900);
  assert.equal(narrow.width, 276);
  assert.equal(narrow.left, 12);
});

test("the select menu never asks for more height than the viewport allows", () => {
  const position = selectPopoverPosition(anchor(200, 240), 800, 300);
  assert.ok(position.maxHeight <= 276);
  assert.equal(position.top, "auto");
});
