import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("creation persists only on Save/Publish; discard and failed requests leave no new set", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/tests/practice-creation-browser.html",
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
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const server = await createServer({
    cacheDir: "node_modules/.vite-practice-creation-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  let fixture;
  const text = () => document.body.textContent;
  const waitFor = async (condition) => {
    for (let i = 0; i < 100; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      if (condition()) return;
    }
    assert.fail(`Timed out waiting for UI. ${text()}`);
  };
  const click = async (label, tag = "button") => {
    const element = [...document.querySelectorAll(tag)].find(
      (node) => node.textContent.trim() === label && !node.closest("dialog:not([open])"),
    );
    assert.ok(element, `Missing ${tag}: ${label}`);
    assert.ok(!element.disabled, `Disabled control: ${label}`);
    await act(async () => {
      element.click();
    });
  };
  const fill = async (name, value) => {
    const input = document.querySelector(`input[name="${name}"]`);
    assert.ok(input, `Missing input: ${name}`);
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(
        input,
        value,
      );
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  const metadata = async (code) => {
    await fill("code", code);
    await fill("title", code);
  };
  const add = async (number = 1) => {
    await waitFor(() =>
      document.querySelector(`[aria-label="Thêm câu ${number} vào bộ luyện tập"]`),
    );
    await act(async () => {
      document.querySelector(`[aria-label="Thêm câu ${number} vào bộ luyện tập"]`).click();
    });
  };
  const leave = async () => {
    await click("← Bộ luyện tập của tôi", "a");
    await waitFor(() => document.querySelector("dialog[open]"));
    await click("Bỏ thay đổi và rời trang");
    await waitFor(() => text().includes("Bộ luyện tập của tôi"));
  };
  try {
    await act(async () => {
      fixture = await server.ssrLoadModule("/tests/practice-creation-browser.tsx");
    });
    await waitFor(() => text().includes("Synthetic Part 5 question 1"));
    await metadata("DISCARDED");
    await add();
    const search = document.querySelector('input[maxlength="200"]');
    assert.equal(
      search.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      ),
      false,
    );
    assert.equal(fixture.records.size, 0);
    assert.ok(text().includes("Create requests: 0"));
    await click("← Bộ luyện tập của tôi", "a");
    await click("Huỷ");
    assert.equal(document.querySelector('input[name="title"]').value, "DISCARDED");
    assert.ok(text().includes("Danh sách đã chọn (1)"));
    await leave();
    assert.equal(fixture.records.size, 0);
    assert.ok(text().includes("Create requests: 0"));
    assert.ok(text().includes("Bạn chưa có bộ luyện tập"));

    await click("Tạo bộ luyện tập", "a");
    await add();
    assert.equal(
      window.dispatchEvent(new dom.window.Event("beforeunload", { cancelable: true })),
      false,
    );
    await leave();
    assert.equal(fixture.records.size, 0);
    assert.ok(text().includes("Create requests: 0"));

    await click("Tạo bộ luyện tập", "a");
    await metadata("SAVED");
    await add(2);
    await add(1);
    await act(async () => {
      document.querySelector('[aria-label="TOEIC Part"]').click();
    });
    await click("Part 4", '[role="option"]');
    await waitFor(() => text().includes("Synthetic Part 4 question 1"));
    assert.ok(text().includes("Danh sách đã chọn (0)"));
    await add(2);
    await add(1);
    await click("Lưu");
    await waitFor(() => text().includes("Chỉnh sửa bộ luyện tập"));
    assert.equal(fixture.records.size, 1);
    const saved = [...fixture.records.values()][0];
    assert.equal(saved.status, "Draft");
    assert.equal(saved.part, "Part4");
    assert.deepEqual(
      saved.items.map((item) => item.questionId.slice(-1)),
      ["2", "1"],
    );
    assert.ok(text().includes("Create requests: 1"));
    await click("← Bộ luyện tập của tôi", "a");
    await waitFor(() => text().includes("2 câu"));
    assert.equal(document.querySelector("dialog[open]"), null);

    await click("Tạo bộ luyện tập", "a");
    await metadata("FAILED");
    await add();
    await act(async () => {
      document.querySelector('input[type="checkbox"]').click();
    });
    await click("Xuất bản");
    await waitFor(() => text().includes("Chưa thể xuất bản"));
    assert.equal(fixture.records.size, 1);
    assert.equal(document.querySelector('input[name="title"]').value, "FAILED");
    assert.ok(text().includes("Danh sách đã chọn (1)"));
    await leave();
    await act(async () => {
      document.querySelector('input[type="checkbox"]').click();
    });

    await click("Tạo bộ luyện tập", "a");
    await metadata("PUBLISHED");
    await add();
    await click("Xuất bản");
    await waitFor(() => text().includes("Chỉnh sửa bộ luyện tập"));
    assert.equal(fixture.records.size, 2);
    const published = [...fixture.records.values()].find((set) => set.code === "PUBLISHED");
    assert.equal(published.status, "Active");
    assert.equal(published.items.length, 1);
    assert.ok(text().includes("Create requests: 3"));
    await fill("title", "UNSAVED EDIT");
    await act(async () => {
      document.querySelector('[aria-label="Bỏ câu ở vị trí 1 khỏi bộ luyện tập"]').click();
    });
    await leave();
    assert.equal(published.title, "PUBLISHED");
    assert.equal(published.items.length, 1);
    assert.ok(!text().includes("UNSAVED EDIT"));
  } finally {
    if (fixture) {
      await act(async () => {
        fixture.root.unmount();
      });
      fixture.router.dispose();
      fixture.client.clear();
    }
    await server.close();
    dom.window.close();
  }
});
