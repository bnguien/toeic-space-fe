import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { matchPath } from "react-router-dom";

test("home page sections, one-item navbar and the site map (jsdom)", async () => {
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
    "HTMLAnchorElement",
    "MutationObserver",
    "Event",
    "KeyboardEvent",
    "MouseEvent",
    "Node",
    "DOMParser",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ])
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.IntersectionObserver = globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };

  const server = await createServer({
    cacheDir: "node_modules/.vite-landing-home-tests",
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
    assert.fail(`Timed out waiting for ${label}: ${text().slice(0, 400)}`);
  };
  const dialog = () => document.querySelector("dialog[open]");
  const mapButton = () => document.querySelector('header button[aria-haspopup="dialog"]');

  let fixture;
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
    /* Every link of the site map, the main entries, the beginner path and the footer is a route. */
    const { router } = await server.ssrLoadModule("/src/app/router.tsx");
    const patterns = [];
    const walk = (routes, base) => {
      for (const route of routes) {
        const path = route.path
          ? route.path.startsWith("/")
            ? route.path
            : `${base.replace(/\/$/, "")}/${route.path}`
          : base;
        if (route.path) patterns.push(path);
        if (route.children) walk(route.children, path);
      }
    };
    walk(router.routes, "/");
    router.dispose();
    const isRoute = (to) => {
      const pathname = to.split(/[?#]/)[0];
      return patterns.some((pattern) => pattern !== "*" && matchPath(pattern, pathname));
    };
    const siteMap = await server.ssrLoadModule("/src/modules/landing/utils/siteMap.ts");
    const homeMap = await server.ssrLoadModule("/src/modules/landing/utils/homeMap.ts");
    const grammar = await server.ssrLoadModule("/src/modules/grammar/index.ts");
    const links = [
      ...siteMap.SITE_MAP.flatMap((group) => group.items.map((item) => item.to)),
      ...siteMap.SITE_MAP_MAIN.map((entry) => entry.to),
      ...homeMap.homeMapLinks(),
      grammar.GRAMMAR_PATH,
    ];
    const dead = links.filter((to) => !isRoute(to));
    assert.deepEqual(dead, [], "no dead links in the site map");

    const module = await server.ssrLoadModule("/tests/landing-home-fixture.tsx");

    /* Guest */
    await act(async () => {
      fixture = module.mountHome(null);
    });
    await waitFor(() => text().includes("Khoá học nổi bật"), "home sections");
    assert.ok(text().includes("Bản đồ TOEICSpace"));
    assert.ok(text().includes("Sắp ra mắt"), "featured courses placeholder");
    for (const removed of ["PHÒNG LUYỆN TẬP", "Hệ sinh thái", "Kiểm tra đầu vào", "0 → 450+"])
      assert.ok(!text().includes(removed), `removed section: ${removed}`);
    const header = document.querySelector("header");
    assert.equal(header.querySelectorAll("nav").length, 0, "no menu in the navbar");
    for (const gone of ["Luyện thi", "Vocab", "Game", "Khóa học", "Về TOEICSpace"])
      assert.ok(!header.textContent.includes(gone), `navbar item removed: ${gone}`);
    assert.ok(mapButton(), "the map button");

    /* Grammar roadmap: one card per stage, opening the stage's first topic. */
    const stageCards = document.querySelectorAll("#ngu-phap ol a");
    assert.equal(stageCards.length, grammar.GRAMMAR_STAGES.length);
    assert.equal(stageCards[0].getAttribute("href"), `/games/grammar?topic=1`);
    assert.ok(
      [...stageCards].every((a) => a.getAttribute("href").startsWith("/games/grammar?topic=")),
    );
    assert.ok(text().includes("Bắt đầu học ngữ pháp"));

    /* Hero CTA scrolls to the map section and focuses its heading. */
    const cta = [...document.querySelectorAll("a")].find(
      (a) => a.textContent.trim() === "Bắt đầu học miễn phí",
    );
    await act(async () => {
      cta.click();
    });
    assert.equal(window.location.hash, "#ban-do");
    assert.equal(document.activeElement?.id, "ban-do-title");

    /* Map tiles open the StudyChill-style popup instead of navigating. */
    const tiles = [...document.querySelectorAll("#ban-do a[aria-haspopup='dialog']")];
    assert.deepEqual(
      tiles.map((t) => t.querySelector("b").textContent),
      ["Luyện Đề", "Luyện Nghe", "Luyện Đọc", "Từ Vựng", "Game"],
    );
    assert.ok(
      tiles.every((t) => t.querySelector("img[alt='']")),
      "tiles show the mascot",
    );
    const click = (node) =>
      node.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    await act(async () => {
      click(tiles[1]);
    });
    await waitFor(() => Boolean(dialog()), "listening popup");
    assert.ok(dialog().textContent.includes("Mô tả tranh"));
    assert.ok(dialog().querySelector("a[href='/practice/listening?part=4']"));
    assert.equal(window.location.pathname, "/", "a tile does not navigate");
    await act(async () => {
      dialog().dispatchEvent(new window.Event("cancel", { cancelable: true }));
    });
    await waitFor(() => !dialog(), "Esc closes the popup");
    await act(async () => {
      click(tiles[0]);
    });
    await waitFor(() => Boolean(dialog()), "exam popup");
    assert.ok(!dialog().textContent.includes("Lịch sử làm bài"), "learner-only entry hidden");
    await act(async () => {
      dialog().querySelector("button[aria-label='Đóng']").click();
    });
    await waitFor(() => !dialog(), "✕ closes the popup");

    /* Navbar "Bản đồ" panel */
    await act(async () => {
      mapButton().click();
    });
    await waitFor(() => Boolean(dialog()), "site map dialog");
    assert.ok(dialog().textContent.includes("Nghe chép chính tả"));
    assert.ok(!dialog().textContent.includes("Từ vựng của tôi"), "learner-only item hidden");
    await act(async () => {
      dialog().dispatchEvent(new window.Event("cancel", { cancelable: true }));
    });
    await waitFor(() => !dialog(), "Esc closes");
    await act(async () => {
      mapButton().click();
    });
    await waitFor(() => Boolean(dialog()), "reopened");
    const video = [...dialog().querySelectorAll("a")].find((a) =>
      a.textContent.includes("Video song ngữ"),
    );
    await act(async () => {
      click(video);
    });
    await waitFor(() => text().includes("Route /games/video"), "navigates");
    assert.equal(dialog(), null, "closed after navigating");
    await unmount();

    /* Learner: role-aware entries */
    await act(async () => {
      fixture = module.mountHome("User");
    });
    await waitFor(() => text().includes("Bản đồ TOEICSpace"), "learner home");
    assert.ok(!text().includes("Đăng ký"));
    await act(async () => {
      click(document.querySelector("#ban-do a[aria-haspopup='dialog']"));
    });
    await waitFor(() => Boolean(dialog()), "learner exam popup");
    assert.ok(dialog().textContent.includes("Lịch sử làm bài"));
    await act(async () => {
      dialog().dispatchEvent(new window.Event("cancel", { cancelable: true }));
    });
    await act(async () => {
      mapButton().click();
    });
    await waitFor(() => Boolean(dialog()), "learner map panel");
    assert.ok(dialog().textContent.includes("Từ vựng của tôi"));
  } finally {
    await unmount();
    await server.close();
    window.close();
  }
});
