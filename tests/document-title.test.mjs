import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement, StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { createServer } from "vite";

const flush = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });

test("the tab title does not keep the previous page's reader title", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const name of ["window", "document", "navigator", "HTMLElement", "Node", "Event"])
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const server = await createServer({
    cacheDir: "node_modules/.vite-document-title-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });

  try {
    const { DEFAULT_DOCUMENT_TITLE, DocumentTitleReset } = await server.ssrLoadModule(
      "/src/shared/components/DocumentTitle/DocumentTitleReset.tsx",
    );

    function ReaderPage() {
      useEffect(() => {
        globalThis.document.title = "An article — Đọc báo song ngữ | TOEIC Space";
      }, []);
      return createElement("p", null, "reader");
    }

    function PlainPage() {
      return createElement("p", null, "plain");
    }

    function OwnTitlePage() {
      useEffect(() => {
        globalThis.document.title = "Video song ngữ · TOEIC Space";
      }, []);
      return createElement("p", null, "video");
    }

    let navigate;
    function Harness() {
      navigate = useNavigate();
      return createElement(
        "div",
        null,
        createElement(DocumentTitleReset),
        createElement(
          Routes,
          null,
          createElement(Route, { path: "/reader", element: createElement(ReaderPage) }),
          createElement(Route, { path: "/plain", element: createElement(PlainPage) }),
          createElement(Route, { path: "/video", element: createElement(OwnTitlePage) }),
        ),
      );
    }

    const root = createRoot(globalThis.document.getElementById("root"));
    act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(MemoryRouter, { initialEntries: ["/reader"] }, createElement(Harness)),
        ),
      );
    });
    await flush();
    assert.equal(globalThis.document.title, "An article — Đọc báo song ngữ | TOEIC Space");

    await act(async () => navigate("/plain"));
    await flush();
    assert.equal(globalThis.document.title, DEFAULT_DOCUMENT_TITLE);

    await act(async () => navigate("/reader"));
    await flush();
    assert.equal(globalThis.document.title, "An article — Đọc báo song ngữ | TOEIC Space");

    // A page that sets its own title still wins over the navigation reset.
    await act(async () => navigate("/video"));
    await flush();
    assert.equal(globalThis.document.title, "Video song ngữ · TOEIC Space");

    await act(async () => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
