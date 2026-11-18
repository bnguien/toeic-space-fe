import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

const flush = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });

const waitFor = async (predicate, timeout = 3000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (predicate()) return;
    await flush();
  }
};

test("Vietnamese administrative helpers split legacy addresses and map OSM results", async () => {
  const server = await createServer({
    cacheDir: "node_modules/.vite-vietnam-address-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  try {
    const {
      addressFromOsm,
      composeAddress,
      findProvince,
      findWard,
      loadVietnamAdministrativeUnits,
      parseAddress,
    } = await server.ssrLoadModule("/src/shared/utils/vietnam-address.ts");

    const legacy = parseAddress("123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM");
    assert.deepEqual(legacy, {
      street: "123 Nguyễn Huệ",
      ward: "Phường Bến Nghé",
      city: "TP. HCM",
    });
    assert.equal(composeAddress(legacy), "123 Nguyễn Huệ, Phường Bến Nghé, TP. HCM");

    const units = await loadVietnamAdministrativeUnits();
    assert.ok(units.length >= 34);
    assert.ok(units.reduce((total, province) => total + province.wards.length, 0) > 3000);
    assert.equal(units.filter((province) => province.wards.length === 0).length, 0);

    const city = findProvince(units, "TP. HCM");
    assert.equal(city?.name, "Thành phố Hồ Chí Minh");
    assert.equal(findWard(city, "Phường Bến Thành")?.name, "Phường Bến Thành");
    assert.equal(findWard(city, "Phường Không Tồn Tại"), undefined);

    const fromOsm = addressFromOsm(units, {
      house_number: "12",
      road: "Lê Lợi",
      suburb: "Phường Bến Thành",
      city: "Thành phố Hồ Chí Minh",
    });
    assert.deepEqual(fromOsm, {
      street: "12 Lê Lợi",
      ward: "Phường Bến Thành",
      city: "Thành phố Hồ Chí Minh",
    });

    const unknownCity = addressFromOsm(units, {
      road: "Đường số 5",
      city: "Thành phố Không Tồn Tại",
    });
    assert.equal(unknownCity.city, "");
    assert.equal(unknownCity.ward, "");
  } finally {
    await server.close();
  }
});

test("AddressPicker starts at the current location and fills the address from a map click", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const name of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "MutationObserver",
    "Event",
    "MouseEvent",
    "Node",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  Object.defineProperty(window.HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 600,
  });
  Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 240,
  });
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success) =>
        success({ coords: { latitude: 10.7769, longitude: 106.7009 } }),
    },
  });
  window.HTMLElement.prototype.getBoundingClientRect = () => ({
    width: 600,
    height: 240,
    left: 0,
    top: 0,
    right: 600,
    bottom: 240,
    x: 0,
    y: 0,
  });
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };

  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    if (String(url).includes("/reverse")) {
      return {
        ok: true,
        json: async () => ({
          features: [
            {
              geometry: { coordinates: [106.7009, 10.7769] },
              properties: {
                housenumber: "123",
                street: "Lê Lợi",
                district: "Bến Thành",
                city: "Thành phố Hồ Chí Minh",
                countrycode: "VN",
              },
            },
          ],
        }),
      };
    }
    return { ok: false, status: 500, json: async () => ({}) };
  };

  const server = await createServer({
    cacheDir: "node_modules/.vite-address-picker-tests",
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  try {
    const { AddressPicker } = await server.ssrLoadModule(
      "/src/shared/components/AddressPicker/AddressPicker.tsx",
    );

    let value = { street: "", ward: "", city: "" };
    const root = createRoot(globalThis.document.getElementById("root"));
    const render = () =>
      root.render(
        createElement(AddressPicker, {
          value,
          onChange: (next) => {
            value = next;
            render();
          },
          required: true,
        }),
      );
    act(() => render());
    await flush();

    assert.ok(
      globalThis.document.body.textContent.includes("Bản đồ đang ở vị trí hiện tại của bạn"),
    );
    assert.ok(globalThis.document.querySelector('[title="Vị trí hiện tại của bạn"]'));

    const locate = [...globalThis.document.querySelectorAll("button")].find(
      (node) => node.getAttribute("aria-label") === "Về vị trí hiện tại",
    );
    assert.ok(locate, "missing current-location button");
    await act(async () => locate.click());
    await flush();
    assert.ok(globalThis.document.body.textContent.includes("Đã đưa bản đồ về vị trí hiện tại"));

    const map = globalThis.document.querySelector('[role="application"]');
    assert.ok(map, "missing map surface");
    await act(async () => {
      map.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, clientX: 300, clientY: 120 }),
      );
    });
    await waitFor(() => Boolean(globalThis.document.querySelector('input[name="address"]')?.value));

    assert.equal(requests.length, 1);
    assert.match(requests[0], /photon\.komoot\.io\/reverse/);
    const hidden = globalThis.document.querySelector('input[name="address"]');
    assert.equal(hidden?.value, "123 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh");
    assert.equal(
      globalThis.document.querySelector('input[aria-label="Phường / Xã"]')?.value,
      "Phường Bến Thành",
    );
    assert.equal(
      globalThis.document.querySelector('input[aria-label="Thành phố / Tỉnh"]')?.value,
      "Thành phố Hồ Chí Minh",
    );
    assert.ok(globalThis.document.body.textContent.includes("Đã điền địa chỉ từ bản đồ"));

    act(() => root.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
