import test from "node:test";
import assert from "node:assert/strict";
import {
  checkoutKey,
  quoteChanged,
  shouldPoll,
  remainingSeconds,
  enrollmentResponse,
} from "../src/modules/courses/checkoutState.ts";

test("204 enrollment status means the user is not enrolled", () => {
  assert.equal(enrollmentResponse(204, undefined), null);
  assert.equal(enrollmentResponse(200, null), null);
  const enrollment = { courseId: "course", status: "Active" };
  assert.equal(enrollmentResponse(200, enrollment), enrollment);
});

test("checkout references are scoped by user, course and coupon", () => {
  assert.notEqual(checkoutKey("a", "course", null), checkoutKey("b", "course", null));
  assert.notEqual(checkoutKey("a", "course", null), checkoutKey("a", "course", "SAVE"));
});

test("server order amount changes require review", () => {
  const preview = { originalAmount: 100000, discountAmount: 20000, finalAmount: 80000 };
  assert.equal(quoteChanged(preview, { ...preview }), false);
  assert.equal(quoteChanged(preview, { ...preview, finalAmount: 70000 }), true);
  assert.equal(quoteChanged(preview, { ...preview, originalAmount: 120000 }), true);
});

test("payment polling stops at terminal status, except fulfillment pending", () => {
  assert.equal(shouldPoll(undefined), false);
  assert.equal(shouldPoll({ status: "Pending" }), true);
  assert.equal(shouldPoll({ status: "Paid", fulfillment: "Pending" }), true);
  for (const status of ["Expired", "Cancelled"]) assert.equal(shouldPoll({ status }), false);
  for (const fulfillment of ["Completed", "NeedsReview"])
    assert.equal(shouldPoll({ status: "Paid", fulfillment }), false);
});

test("countdown uses the backend deadline and never becomes negative", () => {
  assert.equal(remainingSeconds("2026-11-10T12:00:15Z", Date.parse("2026-11-10T12:00:00Z")), 15);
  assert.equal(remainingSeconds("2026-11-10T12:00:15Z", Date.parse("2026-11-10T12:00:16Z")), 0);
});
