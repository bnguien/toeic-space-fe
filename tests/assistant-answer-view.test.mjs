import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const ANSWER = [
  "## Tổng quan",
  '[[stat:{"label":"Học viên","value":1234,"unit":"người","delta":12}]]',
  '[[stat:{"label":"Đề đang dùng","value":40,"delta":"-3"}]]',
  "## Theo Part",
  '[[chart:{"type":"bar","title":"Câu hỏi theo Part","x":"part","series":["n"],"data":[{"part":"P1","n":120},{"part":"P2","n":250},{"part":"P3","n":390}]}]]',
  '[[chart:{"type":"stacked","x":"part","series":[{"key":"a","name":"Đã duyệt"},{"key":"b","name":"Nháp"}],"data":[{"part":"P1","a":1,"b":2},{"part":"P2","a":3,"b":4},{"part":"P3","a":5,"b":6}]}]]',
  '[[chart:{"type":"hbar","x":"part","series":["n"],"data":[{"part":"P5","n":12},{"part":"P6","n":4}]}]]',
  '[[chart:{"type":"area","x":"day","series":["n","m"],"data":[{"day":"2026-11-04","n":5,"m":1},{"day":"2026-11-05","n":null,"m":2},{"day":"2026-11-06","n":7,"m":3}]}]]',
  '[[chart:{"type":"donut","unit":"câu","data":[{"k":"A","v":5},{"k":"B","v":3},{"k":"C","v":1},{"k":"D","v":1},{"k":"E","v":1},{"k":"F","v":1}]}]]',
  '[[chart:{"type":"line","x":"d","series":["n"],"data":[{"d":"a","n":1},{"d":"b","n":2}]}]]',
  '[[action:{"title":"Mở khoá 3 đề","summary":"Chuyển sang Đang sử dụng"}]]',
  "| Part | Câu |",
  "|---|---|",
  "| 1 | 120 |",
  "- Xem [danh sách](/admin/exams/list) <b>ngay</b>",
].join("\n");

test("AnswerView renders every block kind without throwing", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { AnswerView } = await server.ssrLoadModule(
      "/src/modules/admin/assistant/components/AnswerView.tsx",
    );
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(AnswerView, { text: ANSWER })),
    );
    assert.match(html, /1\.234/);
    assert.match(html, /\+12/);
    assert.match(html, /Câu hỏi theo Part/);
    assert.match(html, /role="img"/);
    assert.match(html, /Khác/);
    assert.match(html, /Mở khoá 3 đề/);
    assert.match(html, /href="\/admin\/exams\/list"/);
    assert.doesNotMatch(html, /<b>ngay<\/b>/);
    // Two points of a line chart: no drawing, the figures stay as a table.
    assert.equal((html.match(/Xem bảng số liệu/g) ?? []).length, 5);
  } finally {
    await server.close();
  }
});
