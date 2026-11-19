import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("practice workspace: check, navigate, submit, review, exam redirect and Part 1 game", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const { document } = window;
  for (const name of [
    "window",
    "document",
    "navigator",
    "localStorage",
    "sessionStorage",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLDialogElement",
    "HTMLMediaElement",
    "Audio",
    "MutationObserver",
    "Event",
    "KeyboardEvent",
    "MouseEvent",
    "PointerEvent",
    "SubmitEvent",
    "Node",
    "Element",
    "DOMParser",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};

  const server = await createServer({
    cacheDir: "node_modules/.vite-practice-workspace-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  let fixture;
  const text = () => document.body.textContent ?? "";
  const waitFor = async (predicate, label = "") => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      if (predicate()) return;
    }
    assert.fail(`Timed out waiting for ${label}: ${text().slice(0, 600)}`);
  };
  const visible = (node) => !node.closest("dialog:not([open])");
  const button = (label) =>
    [...document.querySelectorAll("button")].find(
      (node) =>
        visible(node) &&
        (typeof label === "string"
          ? node.textContent.trim() === label
          : label.test(node.textContent.trim())),
    );
  const click = async (label) => {
    const node = typeof label === "object" && "click" in label ? label : button(label);
    assert.ok(node, `Missing button: ${label}`);
    assert.equal(node.disabled, false, String(label));
    await act(async () => {
      node.click();
    });
  };
  const option = (key) =>
    [...document.querySelectorAll('input[type="radio"]')].find(
      (input) => input.value === key && visible(input),
    );
  const press = async (key) => {
    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true }));
    });
  };
  const mount = async (options) => {
    const module = await server.ssrLoadModule("/tests/practice-workspace-fixture.tsx");
    await act(async () => {
      fixture = module.mountWorkspaceFixture(options);
    });
  };
  const unmount = async () => {
    if (!fixture) return;
    await act(async () => {
      fixture.root.unmount();
    });
    fixture.router.dispose();
    fixture.client.clear();
    fixture = null;
  };

  try {
    /* ---- Live practice attempt ---- */
    await mount();
    await waitFor(() => text().includes("Câu 1 / 7"), "header progress");
    assert.ok(text().includes("Fixture test · Luyện tập"));
    assert.ok(!text().includes("Secret statement"), "Part 1 statements stay hidden");
    assert.ok(text().includes("Chọn câu mô tả đúng nhất bức tranh."));
    assert.ok(document.querySelector('img[src="https://example.com/photo1.png"]'));

    await act(async () => {
      option("B").closest("label").click();
    });
    await waitFor(() => option("B").checked, "selected B");
    await click("Kiểm tra đáp án câu 1");
    await waitFor(() => text().includes("Sai rồi! Bạn chọn (B), đáp án đúng: (A)"), "result");
    assert.deepEqual(fixture.calls.check, [[fixture.questions[0].id]]);
    assert.ok(text().includes("Secret statement A1"), "statements after the check");
    assert.ok(text().includes("The man is reading 1."), "script after the check");
    assert.ok(text().includes("Người đàn ông đang đọc."), "translation after the check");
    assert.ok(text().includes("Giải thích câu 1"));
    assert.ok(text().includes("Because of reason 1."), "explanation open for one question");
    assert.ok(text().includes("Hỏi thêm AI"));
    assert.equal(button(/Kiểm tra đáp án câu 1/), undefined, "no check button once revealed");

    // → moves to the Part 2 question; the tip card shows on desktop.
    await press("ArrowRight");
    await waitFor(() => text().includes("Câu 2 / 7"), "next group");
    assert.ok(text().includes("Part 2: Hỏi & Đáp phản xạ"));
    await press("1");
    await waitFor(() => option("A").checked, "key 1 answers A");

    // Part 3 group: no transcript before the check.
    await click("Tiếp theo");
    await waitFor(() => text().includes("Nhóm câu 3-4 / 7"), "P3 group");
    assert.ok(text().includes("Nhóm câu 32-33 (2 câu hỏi)"));
    assert.ok(!text().includes("Did you see the memo"), "no script before the check");
    await click("Kiểm tra nhóm câu 32–33");
    await waitFor(() => text().includes("Transcript (Lời thoại)"), "transcript after check");
    assert.ok(text().includes("Did you see the memo about Monday?"));

    // Grid drawer jumps to Part 5.
    await click(/^5\/7$|^32-33\/7$/);
    await waitFor(() => document.querySelector("dialog[open]"), "grid drawer");
    assert.ok(text().includes("Danh sách câu hỏi"));
    const cell = [...document.querySelectorAll("dialog[open] button")].find(
      (node) => node.textContent.trim() === "101",
    );
    await click(cell);
    await waitFor(() => text().includes("Câu 101 — Hoàn thành câu"), "P5 sentence card");
    assert.ok(text().includes("Mẹo: Xác định từ loại"));

    // Flag + last group submit with the unanswered warning.
    await click("Đánh dấu xem lại");
    await waitFor(() => fixture.calls.flags === 1, "flag saved");
    await click("Tiếp theo");
    await waitFor(() => text().includes("Nhóm câu 6-7 / 7"), "P7 group");
    assert.ok(text().includes("Our office is closed on Monday."));
    await click("Nộp bài ✓");
    await waitFor(() => text().includes("câu chưa trả lời!"), "unanswered dialog");
    assert.ok(text().includes("Danh sách câu còn thiếu:"));
    await click("Vẫn nộp bài");
    await waitFor(() => text().includes("Kết quả bài làm"), "score overlay");
    assert.equal(fixture.calls.submits, 1);
    assert.ok(text().includes("% đúng"));
    assert.ok(text().includes("Tổng câu đúng"));
    assert.ok(text().includes("02:05"), "duration from the result");
    assert.ok(button("Luyện lại câu sai"));
    assert.ok(text().includes("Xem điểm"));
    assert.equal(button("Nộp bài"), undefined, "no submit after the result");

    await click("Xem lại bài thi");
    await waitFor(() => fixture.router.state.location.pathname.endsWith("/review"), "review route");
    await waitFor(() => text().includes("Chính xác!") || text().includes("Sai rồi!"), "revealed");
    await unmount();

    /* ---- Review route: everything revealed, nothing editable ---- */
    await mount({ path: "review" });
    await waitFor(() => text().includes("Câu 1 / 7"), "review header");
    assert.ok(text().includes("Xem lại"));
    assert.ok(text().includes("The man is reading 1."), "statements revealed in review");
    assert.equal(button("Nộp bài"), undefined);
    assert.ok(
      [...document.querySelectorAll('input[type="radio"]')].every((input) => input.disabled),
      "options locked",
    );
    await unmount();

    /* ---- A running mock exam goes to the exam room ---- */
    await mount({ kind: "fulltest" });
    await waitFor(() => text().includes("EXAM ROOM"), "exam redirect");
    await unmount();

    /* ---- Part 1 game: Điền từ khoá ---- */
    await mount({
      kind: "part1",
      state: { part1Game: "keyword", from: "/practice/listening?part=1" },
    });
    await waitFor(() => text().includes("Bước 1 · Câu nào mô tả đúng bức tranh?"), "game");
    assert.ok(text().includes("Đổi cách học"));
    assert.ok(text().includes("Part 1 · Điền từ khoá"));
    assert.ok(!text().includes("Secret statement"), "no statements before the check");
    await click("(A)");
    await click("Chốt đáp án");
    await waitFor(() => text().includes("Bước 2 · Nghe lại, điền từ khoá còn thiếu"), "step 2");
    assert.ok(text().includes("Chính xác! Đáp án là (A)."));
    assert.deepEqual(fixture.calls.check, [[fixture.questions[0].id]]);
    assert.ok(text().includes("Bấm một từ bên dưới để thả vào ô trống."));
    await click("Bỏ qua");
    await waitFor(() => text().includes("Câu 2/3"), "next photo");
    await click("Đổi cách học");
    await waitFor(() => text().includes("SETUP PAGE"), "back to setup");
  } finally {
    await unmount();
    await server.close();
    window.close();
  }
});
