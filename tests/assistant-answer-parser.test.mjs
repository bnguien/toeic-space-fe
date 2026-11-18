import assert from "node:assert/strict";
import test from "node:test";

import {
  answerToPlainText,
  dateLabel,
  formatNumber,
  parseAnswer,
  parseInline,
  readChart,
  readStat,
  scanTokens,
} from "../src/modules/admin/assistant/utils/answerParser.ts";

const blocks = (text) => parseAnswer(text).flatMap((section) => section.blocks);

test("sections, lists, sub-items and tables", () => {
  const sections = parseAnswer(
    [
      "Chào bạn.",
      "## Số liệu",
      "- Part 1: 120 câu",
      "◦ đã duyệt 100",
      "1. Bước một",
      "2. Bước hai",
      "| Part | Câu |",
      "|---|---|",
      "| 1 | 120 |",
      "Nhận định:",
      "Ổn.",
    ].join("\n"),
  );
  assert.equal(sections.length, 3);
  assert.equal(sections[0].title, undefined);
  assert.equal(sections[1].title, "Số liệu");
  assert.equal(sections[2].title, "Nhận định");
  const [list, steps, table] = sections[1].blocks;
  assert.deepEqual(list, {
    kind: "list",
    ordered: false,
    items: [{ text: "Part 1: 120 câu", children: ["đã duyệt 100"] }],
  });
  assert.equal(steps.kind, "list");
  assert.equal(steps.ordered, true);
  assert.equal(steps.items.length, 2);
  assert.deepEqual(table, { kind: "table", head: ["Part", "Câu"], rows: [["1", "120"]] });
});

test("word-joiner lines continue the previous line", () => {
  const [block] = blocks("Một câu rất dài\u2060 được nối tiếp");
  assert.deepEqual(block, { kind: "text", text: "Một câu rất dài được nối tiếp" });
});

test("media and link lines", () => {
  const out = blocks(
    [
      "https://cdn.example.com/a.png",
      "https://cdn.example.com/a.mp3",
      "https://example.com/report",
      "[Danh sách](/admin/students/list) · [Đề](/admin/exams)",
      "![Ảnh](https://cdn.example.com/b.jpg)",
    ].join("\n"),
  );
  assert.equal(out[0].kind, "media");
  assert.equal(out[0].media, "image");
  assert.equal(out[1].media, "audio");
  assert.equal(out[2].kind, "links");
  assert.equal(out[2].links.length, 3);
  assert.equal(out[2].links[0].bare, true);
  assert.equal(out[2].links[1].internal, true);
  assert.equal(out[2].links[1].href, "/admin/students/list");
  assert.equal(out[3].kind, "media");
  assert.equal(out[3].label, "Ảnh");
});

test("inline bold, links and trailing punctuation of bare URLs", () => {
  const pieces = parseInline(
    "Xem **Part 1** tại https://example.com/p1. Hoặc [đây](/admin/exams).",
  );
  assert.deepEqual(
    pieces.map((piece) => piece.kind),
    ["text", "bold", "text", "link", "text", "link", "text"],
  );
  assert.equal(pieces[3].link.href, "https://example.com/p1");
  assert.equal(pieces[4].text, ". Hoặc ");
  assert.equal(pieces[5].link.internal, true);
});

test("chart token: x detection, series cap, date labels, few points stay a table", () => {
  const chart = readChart({
    type: "line",
    title: "Đăng ký",
    unit: "người",
    data: [
      { day: "2026-11-04", users: 5, teachers: "1" },
      { day: "2026-11-05", users: 7, teachers: 2 },
      { day: "2026-11-06", users: null, teachers: 3 },
    ],
  });
  assert.equal(chart.type, "line");
  assert.deepEqual(
    chart.series.map((item) => item.name),
    ["users", "teachers"],
  );
  assert.deepEqual(
    chart.data.map((row) => row.label),
    ["4/11", "5/11", "6/11"],
  );
  assert.deepEqual(chart.data[0].values, { s0: 5, s1: 1 });
  assert.equal(chart.data[2].values.s0, null);
  assert.equal(chart.drawable, true);

  const short = readChart({ type: "bar", x: "part", series: ["n"], data: [{ part: "1", n: 2 }] });
  assert.equal(short.drawable, false);
  assert.equal(short.data.length, 1);

  const named = readChart({
    type: "stacked",
    x: "part",
    series: [
      { key: "a", name: "Đã duyệt" },
      { key: "b", name: "Nháp" },
    ],
    data: [
      { part: "P1", a: 1, b: 2 },
      { part: "P2", a: 3, b: 4 },
      { part: "P3", a: 5, b: 6 },
    ],
  });
  assert.deepEqual(
    named.series.map((item) => item.name),
    ["Đã duyệt", "Nháp"],
  );

  assert.equal(readChart({ type: "bar", data: [] }), null);
  assert.equal(readChart({ type: "bar", data: [{ a: "x" }] }), null);
  assert.equal(readChart("nope"), null);
});

test("pie keeps five slices and folds the rest into Khác", () => {
  const chart = readChart({
    type: "donut",
    data: Array.from({ length: 8 }, (_, index) => ({ name: `P${index}`, n: 8 - index })),
  });
  assert.equal(chart.data.length, 5);
  assert.equal(chart.data[4].label, "Khác");
  assert.equal(chart.data[4].other, true);
  assert.equal(chart.data[4].values.s0, 4 + 3 + 2 + 1);
  assert.equal(chart.drawable, true);
});

test("stat token: delta sign gives the trend, consecutive stats group", () => {
  assert.deepEqual(readStat({ label: "Học viên", value: 1234, unit: "người", delta: 12 }), {
    label: "Học viên",
    value: 1234,
    unit: "người",
    delta: "+12",
    trend: "up",
    hint: "",
  });
  assert.equal(readStat({ label: "A", value: 1, delta: "-3%" }).trend, "down");
  assert.equal(readStat({ label: "A", value: 1, delta: 0 }).trend, "");
  assert.equal(readStat({ label: "A", value: "" }), null);
  assert.equal(readStat({ value: 1 }), null);

  const out = blocks(
    [
      '[[stat:{"label":"A","value":1}]]',
      '[[stat:{"label":"B","value":2}]]',
      "Chữ",
      '[[stat:{"label":"C","value":3}]]',
    ].join("\n"),
  );
  assert.equal(out[0].kind, "stats");
  assert.equal(out[0].items.length, 2);
  assert.equal(out[1].kind, "text");
  assert.equal(out[2].items.length, 1);
});

test("tokens: several on one line, cut across lines, unknown kinds dropped", () => {
  assert.equal(
    scanTokens('[[stat:{"label":"A","value":1}]] [[stat:{"label":"B","value":2}]]').length,
    2,
  );
  assert.equal(scanTokens('[[stat:{"label":"A"}]] trailing'), null);
  const json = JSON.stringify({ label: "Một nhãn khá dài để cắt dòng", value: 1 });
  const cut = `[[stat:${json}]]`;
  const at = 20;
  const out = blocks(`${cut.slice(0, at)}\n\u2060${cut.slice(at)}`);
  assert.equal(out[0].kind, "stats");
  assert.equal(blocks('[[widget:{"x":1}]]').length, 0);
  assert.equal(blocks('[[chart:{"type":"bar"}]]').length, 0);
  const [action] = blocks('[[action:{"title":"Mở khoá","summary":"Mở 3 đề","tier":2}]]');
  assert.deepEqual(action, { kind: "action", action: { title: "Mở khoá", summary: "Mở 3 đề" } });
});

test("plain text of an answer", () => {
  const text = answerToPlainText(
    [
      "## Số liệu",
      '[[stat:{"label":"Học viên","value":1234,"unit":"người","delta":12}]]',
      '[[chart:{"type":"bar","title":"Theo Part","x":"part","series":["n"],"data":[{"part":"P1","n":1500},{"part":"P2","n":2.5},{"part":"P3","n":null}]}]]',
      "- **Ghi chú** tại [đây](/admin/exams)",
    ].join("\n"),
  );
  assert.equal(
    text,
    [
      "Số liệu",
      "Học viên: 1.234 người (+12)",
      "Theo Part:",
      "- P1: 1.500",
      "- P2: 2,5",
      "- P3: —",
      "- Ghi chú tại đây (/admin/exams)",
    ].join("\n"),
  );
});

test("number and date formatting", () => {
  assert.equal(formatNumber(12345), "12.345");
  assert.equal(formatNumber(12.5), "12,5");
  assert.equal(formatNumber("x"), "x");
  assert.equal(dateLabel("2026-11-04"), "4/11");
  assert.equal(dateLabel("2026-11-04T13:00:00Z"), "4/11");
  assert.equal(dateLabel("2026-11"), "11/2026");
  assert.equal(dateLabel("Part 1"), "Part 1");
});
