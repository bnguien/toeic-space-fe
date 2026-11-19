import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("practice space and Góc luyện tập render from server data (jsdom)", async () => {
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
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLDialogElement",
    "MutationObserver",
    "Event",
    "MouseEvent",
    "SubmitEvent",
    "Node",
    "DOMParser",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };

  const server = await createServer({
    cacheDir: "node_modules/.vite-practice-space-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const text = () => document.body.textContent ?? "";
  const waitFor = async (predicate, label) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      if (predicate()) return;
    }
    assert.fail(`Timed out waiting for ${label}: ${text().slice(0, 600)}`);
  };
  const buttonByText = (label) =>
    [...document.querySelectorAll("button")].find(
      (node) => node.textContent.trim() === label && !node.closest("dialog:not([open])"),
    );
  const click = async (node, label) => {
    assert.ok(node, `Missing ${label}`);
    await act(async () => {
      node.click();
    });
  };

  let fixture;
  const unmount = async () => {
    if (!fixture) return;
    assert.deepEqual(fixture.unexpected, [], "every request is mocked");
    await act(async () => {
      fixture.root.unmount();
    });
    fixture.router.dispose();
    fixture.client.clear();
    fixture = null;
  };

  try {
    const module = await server.ssrLoadModule("/tests/practice-space-fixture.tsx");
    const { ids } = module;

    /* Guest: the overview shows the catalogue and asks to sign in before opening a test. */
    await act(async () => {
      fixture = module.mountSpaceFixture("/practice/exam", null);
    });
    await waitFor(() => text().includes("Đề luyện"), "guest overview");
    assert.ok(text().includes("ETS 2026"));
    assert.ok(text().includes("Đăng nhập để lưu tiến độ"));
    assert.ok(!text().includes("Đang làm"), "no progress figures for guests");
    assert.ok(!fixture.requests.some((r) => r.url.startsWith("/me/")), "no learner requests");
    await click(buttonByText("Bắt đầu Test 01"), "guest CTA");
    await waitFor(() => text().includes("Đăng nhập để làm ETS 2026 - Test 01"), "sign-in prompt");
    await unmount();

    /* Learner: progress, series grid, config dialog with the in-progress conflict. */
    await act(async () => {
      fixture = module.mountSpaceFixture("/practice/exam", "User");
    });
    await waitFor(() => text().includes("Làm tiếp Test 01"), "learner CTA");
    assert.ok(text().includes("Đang làm"));
    await click(
      [...document.querySelectorAll("button")].find((b) => b.title?.startsWith("ETS 2026 · 2 đề")),
      "series row",
    );
    await waitFor(
      () => document.querySelectorAll('button[aria-label^="ETS 2026 - Test"]').length === 2,
      "test cards",
    );
    const cards = [...document.querySelectorAll('button[aria-label^="ETS 2026 - Test"]')];
    assert.equal(cards[0].dataset.state, "next");
    assert.equal(cards[1].dataset.state, "todo");
    await click(cards[0], "Test 01 card");
    await waitFor(
      () => text().includes("Đề này có bài làm trước"),
      "resume note (dialog follows the active attempt)",
    );
    assert.ok(buttonByText("Tiếp tục làm bài"), "default action continues the attempt");
    // Choosing other parts than the attempt in progress is a conflict the learner must resolve.
    await click(buttonByText("Cả đề"), "quick pick");
    await waitFor(() => text().includes("Đề này đang có bài Luyện tập làm dở"), "conflict note");
    assert.ok(buttonByText("Tiếp tục bài đó"));
    assert.ok(buttonByText("Làm lại với cấu hình mới"));
    await click(buttonByText("Tiếp tục bài đó"), "continue that attempt");
    await waitFor(
      () => text().includes(`Workspace ${ids.active}`),
      "workspace of the active attempt",
    );
    assert.ok(text().includes('"speed":1'));
    await unmount();

    /* Listening part view: set card + "Từ đề thi" list. */
    await act(async () => {
      fixture = module.mountSpaceFixture("/practice/listening?part=1", "User");
    });
    await waitFor(() => text().includes("Bộ luyện theo cấp độ"), "part grid");
    assert.ok(text().includes("Căn bản 450+"));
    assert.ok(text().includes("Từ đề thi"));
    assert.ok(text().includes("3/20 câu"));
    await unmount();

    /* Góc luyện tập: counts, disabled review, random N start request and navigation state. */
    await act(async () => {
      fixture = module.mountSpaceFixture(`/practice/parts/${ids.set1}`, "User");
    });
    await waitFor(
      () => text().includes("Hôm nay bạn muốn học thế nào?") && text().includes("Chưa làm"),
      "setup hero",
    );
    await waitFor(() => text().includes("Học phần nào?"), "setup form");
    assert.ok(text().includes("Chưa có bài nào đã nộp để xem chữa."));
    assert.ok(text().includes("Làm lại 1 câu đã chấm sai"));
    assert.ok(text().includes("Luyện theo kiểu nào?"), "Part 1 game step");
    const random = document.querySelector('input[name="setup-choice"][value="random"]');
    await act(async () => {
      random.click();
    });
    await waitFor(() => text().includes("Tạo bài 20 câu và bắt đầu"), "random label");
    await click(buttonByText("10 câu"), "quick count");
    await act(async () => {
      document.querySelector('input[name="game-mode"][value="keyword"]').click();
    });
    await click(buttonByText("Tạo bài 10 câu và bắt đầu"), "start");
    await waitFor(() => text().includes(`Workspace ${ids.started}`), "workspace after start");
    const post = fixture.requests.find((r) => r.method === "post");
    assert.deepEqual(post.body, { expectedGeneration: 1, selection: "Random", count: 10 });
    assert.ok(text().includes('"part1Game":"keyword"'));
    assert.ok(text().includes(`"from":"/practice/parts/${ids.set1}"`));
  } finally {
    await unmount();
    await server.close();
    window.close();
  }
});
