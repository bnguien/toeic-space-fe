import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("stale question saves warn without losing drafts; open Student Preview clears revoked cached content", async () => {
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
  const server = await createServer({
    cacheDir: "node_modules/.vite-practice-access-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  let fixture;
  const text = () => document.body.textContent;
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      if (predicate()) return;
    }
    assert.fail(`Timed out waiting for UI: ${text()}`);
  };
  const button = (label) =>
    [...document.querySelectorAll("button")].find(
      (node) => node.textContent.trim() === label && !node.closest("dialog:not([open])"),
    );
  const click = async (label) => {
    const node = button(label);
    assert.ok(node, `Missing button: ${label}`);
    assert.equal(node.disabled, false, label);
    await act(async () => {
      node.click();
    });
  };
  const remove = async (position) => {
    await act(async () => {
      document
        .querySelector(`[aria-label="Bỏ câu ở vị trí ${position} khỏi bộ luyện tập"]`)
        .click();
    });
  };
  const focus = async () => {
    await act(async () => {
      window.dispatchEvent(new window.Event("focus"));
    });
  };
  const previewCache = () =>
    fixture.client.getQueriesData({ queryKey: ["practice-sets", "preview"] });
  const assertCleared = () => {
    assert.ok(!text().includes("Protected question"));
    assert.ok(!text().includes("Protected explanation"));
    assert.equal(document.querySelector('img[src*="protected-preview"]'), null);
    assert.equal(document.querySelector("audio"), null);
    assert.ok(previewCache().every(([, data]) => !data?.content && !data?.set));
  };
  try {
    const module = await server.ssrLoadModule("/tests/practice-access-fixture.tsx");
    await act(async () => {
      fixture = module.mountPracticeFixture();
    });
    await waitFor(() => text().includes("Danh sách đã chọn (2)"));
    const [first, second] = fixture.questions.map((q) => q.id);
    await remove(1); // Local editor now wants only question 2.
    fixture.replace([second, first]); // Another editor saved, without notifying this tab.
    await click("Lưu danh sách câu hỏi");
    await waitFor(() => text().includes("Dữ liệu đã thay đổi ở nơi khác"));
    assert.deepEqual(fixture.lastSave, {
      questionIds: [second],
      expectedQuestionIds: [first, second],
    });
    assert.deepEqual(
      fixture.set.items.map((item) => item.questionId),
      [second, first],
    );
    assert.ok(text().includes("Danh sách đã chọn (1)"));
    assert.equal(button("Lưu danh sách câu hỏi").disabled, true);
    await click("Tải danh sách từ máy chủ");
    assert.ok(text().includes("Danh sách đã chọn (1)"));
    await click("Bỏ thay đổi và tải lại");
    await waitFor(() => text().includes("Danh sách đã chọn (2)"));
    await remove(2);
    await click("Lưu danh sách câu hỏi");
    await waitFor(() => text().includes("Đã lưu danh sách câu hỏi."));
    assert.deepEqual(fixture.lastSave.expectedQuestionIds, [second, first]);
    assert.deepEqual(
      fixture.set.items.map((item) => item.questionId),
      [second],
    );

    fixture.set.status = "Active";
    await act(async () => {
      fixture.login("User");
      await fixture.router.navigate(`/practice/parts/${fixture.id}`);
    });
    await waitFor(() => text().includes("Protected question 2"));
    assert.ok(text().includes("Protected explanation"));
    assert.equal(document.querySelectorAll("audio").length, 1);
    fixture.set.status = "Archived";
    // No invalidation, navigation or focus event: the visible Preview must notice by polling.
    await waitFor(() => text().includes("Không tìm thấy bộ luyện tập"));
    assertCleared();
    fixture.set.status = "Active";
    await focus();
    await waitFor(() => text().includes("Protected question 2"));
    fixture.denyContent(true); // Detail can still succeed while content authorization fails.
    await focus();
    await waitFor(() => text().includes("Bạn không có quyền"));
    assertCleared();
    fixture.denyContent(false);
    await focus();
    await waitFor(() => text().includes("Protected question 2"));
    fixture.setOffline(true);
    await focus();
    await waitFor(() => text().includes("Không tải hoặc lưu được dữ liệu"));
    assertCleared();
    fixture.setOffline(false);
    await focus();
    await waitFor(() => text().includes("Protected question 2"));
    fixture.deleteSet();
    await focus();
    await waitFor(() => text().includes("Không tìm thấy bộ luyện tập"));
    assertCleared();
    await act(async () => {
      await fixture.router.navigate("/practice/parts");
    });
    await waitFor(() => text().includes("Outside Preview"));
    assert.equal(previewCache().length, 0);
    await act(async () => {
      await fixture.router.navigate(`/practice/parts/${fixture.id}`);
    });
    assert.ok(!text().includes("Protected question"));
    await waitFor(() => text().includes("Không tìm thấy bộ luyện tập"));
    assertCleared();
  } finally {
    if (fixture) {
      await act(async () => {
        fixture.root.unmount();
      });
      fixture.router.dispose();
      fixture.client.clear();
    }
    await server.close();
    window.close();
  }
});
