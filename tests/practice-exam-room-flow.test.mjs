import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("exam room → submit → result page with detail dialog (mocked API)", async () => {
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
    "HTMLMediaElement",
    "Audio",
    "MutationObserver",
    "Event",
    "KeyboardEvent",
    "MouseEvent",
    "PointerEvent",
    "FocusEvent",
    "Node",
    "DOMParser",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};

  const server = await createServer({
    cacheDir: "node_modules/.vite-practice-exam-room-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  let fixture;
  const text = () => document.body.textContent;
  const flush = async (ms = 20) =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
  const waitFor = async (predicate, label = "") => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await flush();
      if (predicate()) return;
    }
    assert.fail(`Timed out waiting for ${label}: ${text().slice(0, 600)}`);
  };
  const visible = (node) => !node.closest("dialog:not([open])");
  const button = (label) =>
    [...document.querySelectorAll("button")].find(
      (node) =>
        (node.textContent.trim() === label || node.getAttribute("aria-label") === label) &&
        visible(node),
    );
  const click = async (label) => {
    const node = button(label);
    assert.ok(node, `Missing button: ${label}`);
    assert.equal(node.disabled, false, label);
    await act(async () => {
      node.click();
    });
  };
  const key = async (value, init = {}, target = window) => {
    await act(async () => {
      target.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: value, bubbles: true, ...init }),
      );
    });
  };

  try {
    const module = await server.ssrLoadModule("/tests/practice-exam-room-fixture.tsx");
    await act(async () => {
      fixture = module.mountExamFixture();
    });
    const [q101, , q147] = fixture.questions.map((q) => q.id);

    /* Intro: counts, rules, volume, start. */
    await waitFor(() => text().includes("Bắt đầu làm bài"), "intro");
    assert.ok(text().includes("Fixture Test 01"));
    assert.ok(text().includes("Thi thử · mô phỏng phòng thi máy tính"));
    assert.ok(text().includes("Listening 100"));
    assert.ok(text().includes("hết giờ tự nộp"));
    assert.ok(document.querySelector('input[type="range"]'), "volume slider");
    assert.ok(button("Thử âm thanh"));
    assert.equal(button("Tiếp tục bài đang làm"), undefined, "no resume without an attempt");
    await click("Bắt đầu làm bài");

    /* Reading directions → Part 5 (one question per screen, blank filled, keys). */
    await waitFor(() => text().includes("Part 5: Incomplete Sentences"), "Part 5 directions");
    assert.deepEqual(fixture.starts, [{ mode: "FullTest" }]);
    assert.ok(text().includes("Reading · Directions"));
    assert.ok(text().includes("0/4 câu"));
    await click("Bắt đầu Part 5");
    await waitFor(() => text().includes("Câu 101 / 4"), "question 101");
    await key("2");
    await waitFor(() => fixture.saves.some((s) => s.questionId === q101), "save 101");
    assert.deepEqual(fixture.saves.at(-1), { questionId: q101, answer: "B" });
    assert.ok(
      document
        .querySelector('[aria-label="chỗ trống đã điền"]')
        ?.textContent.includes("was submitted"),
      "Part 5 blank shows the chosen option",
    );
    await waitFor(() => text().includes("1/4 câu"), "answered count");
    await click("Đánh dấu xem lại");
    await waitFor(() => fixture.flags.get(q101) === true, "flag saved");
    assert.ok(button("Đã đánh dấu"));
    // Answers stay changeable while the screen is shown.
    await key("c");
    await waitFor(() => fixture.saves.at(-1)?.answer === "C", "changed answer");
    assert.equal(button("Trước").disabled, true, "no Reading screen before the first one");

    await key("ArrowRight");
    await waitFor(() => text().includes("Câu 102 / 4"), "question 102");
    await key("ArrowLeft");
    await waitFor(() => text().includes("Câu 101 / 4"), "back to 101");
    await key("Enter");
    await waitFor(() => text().includes("Câu 102 / 4"), "Enter = next");

    /* Question grid: locks none in Reading, jump back. */
    await click("Bảng câu hỏi");
    await waitFor(() => text().includes("Đã làm 1/4"), "grid");
    const cell = document.querySelector('button[aria-label^="Câu 101:"]');
    assert.ok(cell?.getAttribute("aria-label").includes("đánh dấu"));
    await act(async () => cell.click());
    await waitFor(() => text().includes("Câu 101 / 4"), "jump from grid");

    /* Part 7: directions once, split passage / questions with tabs. */
    await key("ArrowRight");
    await waitFor(() => text().includes("Câu 102 / 4"), "102 again");
    await key("ArrowRight");
    await waitFor(() => text().includes("Part 7: Reading Comprehension"), "Part 7 directions");
    await click("Bắt đầu Part 7");
    await waitFor(() => text().includes("Câu 147–148 / 4"), "Part 7 screen");
    assert.ok(text().includes("The office is closed on Monday"));
    assert.ok(text().includes("Câu hỏi (0/2)"));
    await act(async () => {
      document.querySelector(`input[name="${q147}"][value="C"]`).click();
    });
    await waitFor(() => text().includes("Câu hỏi (1/2)"), "tab count");
    // Back skips the Part 7 directions already heard.
    await click("Trước");
    await waitFor(() => text().includes("Câu 102 / 4"), "back over directions");
    await key("ArrowRight");
    await waitFor(() => text().includes("Câu 147–148 / 4"), "directions skipped");

    /* Submit dialog → result page. */
    await click("Nộp bài");
    await waitFor(() => text().includes("Nộp bài thi?"), "submit dialog");
    assert.ok(text().includes("Nộp rồi thì không sửa được đáp án."));
    const dialog = [...document.querySelectorAll("dialog[open]")].at(-1);
    assert.ok(dialog.textContent.includes("2/4"));
    assert.ok(dialog.textContent.includes("chưa làm"));
    assert.equal(document.activeElement?.textContent.trim(), "Tiếp tục làm", "safe button focused");
    await act(async () => {
      [...dialog.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Nộp bài")
        .click();
    });
    await waitFor(() => text().includes("Kết quả thi thử"), "result page");
    assert.equal(
      fixture.router.state.location.pathname,
      `/practice/attempts/${fixture.attemptId}/result`,
    );
    assert.equal(localStorage.getItem(`toeicspace.exam.position.${fixture.attemptId}`), null);

    /* Result: % card (not whole sections), KPI, part table, answers. */
    assert.ok(text().includes("Tỉ lệ đúng"));
    assert.ok(text().includes("Thời gian làm"));
    assert.ok(text().includes("12:34"));
    assert.ok(text().includes("Phân tích theo Part"));
    assert.ok(text().includes("Hoàn thành câu"));
    assert.ok(button("Xem lại toàn bài") === undefined, "review is a link");
    assert.ok(
      document.querySelector(`a[href="/practice/attempts/${fixture.attemptId}/review"]`),
      "review link",
    );
    await waitFor(() => !!button("Chi tiết câu 101"), "answer list");
    await click("Sai1");
    await waitFor(
      () => !button("Chi tiết câu 147") && !!button("Chi tiết câu 101"),
      "wrong filter",
    );
    await click("Bỏ qua2");
    await waitFor(() => !!button("Chi tiết câu 102") && !button("Chi tiết câu 101"), "skip filter");
    await click("Tất cả4");

    /* Detail dialog: badge, explanation, Alt+arrows. */
    await click("Chi tiết câu 101");
    await waitFor(() => text().includes("Cần động từ bị động quá khứ"), "detail");
    let detail = document.querySelector('dialog[aria-labelledby="result-detail-title"]');
    assert.ok(detail.textContent.includes("Sai"));
    assert.ok(detail.textContent.includes("Đáp án đúng"));
    assert.ok(detail.textContent.includes("1 / 4"));
    await key("ArrowRight", { altKey: true }, detail);
    await waitFor(() => detail.textContent.includes("Câu 102"), "Alt+→");
    assert.ok(detail.textContent.includes("Bạn chưa chọn đáp án cho câu này."));
    await key("ArrowRight", { altKey: true }, detail);
    await waitFor(() => detail.textContent.includes("Câu 147"), "passage question");
    assert.ok(detail.textContent.includes("Bản dịch"));
    await click("Đóng (Esc)");
    await waitFor(
      () => !document.querySelector('dialog[aria-labelledby="result-detail-title"]'),
      "closed",
    );

    /* Unknown attempt → not found. */
    await act(async () => {
      await fixture.router.navigate(
        `/practice/attempts/00000000-0000-4000-8000-000000000999/result`,
      );
    });
    await waitFor(() => text().includes("Không tìm thấy kết quả"), "not found");
    detail = null;

    /* Another visit with an in-progress FullTest: resume dialog, then "Làm lại từ đầu". */
    const remount = async (options) => {
      await act(async () => {
        fixture.root.unmount();
      });
      fixture.router.dispose();
      fixture.client.clear();
      localStorage.clear();
      await act(async () => {
        fixture = module.mountExamFixture(options);
      });
    };
    await remount({ active: "FullTest" });
    await waitFor(() => !!button("Tiếp tục bài đang làm"), "resume dialog");
    assert.ok(text().includes("Bạn có bài đang làm dở"));
    assert.ok(text().includes("37/200"));
    assert.ok(text().includes("1:23:20"));
    assert.ok(text().includes("audio của nhóm câu hiện tại sẽ phát lại từ đầu"));
    assert.equal(document.activeElement?.textContent.trim(), "Tiếp tục bài đang làm");
    await click("Làm lại từ đầu");
    await waitFor(() => text().includes("Bài thi đang làm dở sẽ được huỷ"), "restart note");
    assert.equal(button("Tiếp tục bài đang làm"), undefined);
    await click("Bắt đầu làm bài");
    await waitFor(() => fixture.starts.length === 1, "restart start");
    assert.deepEqual(fixture.starts, [{ mode: "FullTest", restart: true }]);

    /* In-progress Practice attempt of the same test: open it or start a new exam. */
    await remount({ active: "Practice" });
    await waitFor(() => !!button("Mở bài luyện tập"), "practice dialog");
    assert.ok(text().includes("Đề này đang có bài Luyện tập làm dở"));
    assert.ok(button("Bắt đầu thi thử mới"));
    await click("Mở bài luyện tập");
    await waitFor(() => text().includes("Practice workspace"), "practice workspace");
    assert.equal(
      fixture.router.state.location.pathname,
      "/practice/attempts/00000000-0000-4000-8000-000000002818",
    );
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
