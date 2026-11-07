import assert from "node:assert/strict";
import test from "node:test";
import { orderedContent } from "../src/modules/practice/utils/orderedContent.ts";
import { selectionReducer, selectionState } from "../src/modules/practice/utils/pickerSelection.ts";
import { blankLabels } from "../src/shared/components/QuestionContent/blankLabels.ts";
import { tokenizeText, mediaUrls } from "../src/shared/components/RichText/parser.ts";

for (const part of [3, 4, 6, 7]) {
  for (const [sequence, expected] of [
    [
      ["A", "A", "B"],
      [true, false, true],
    ],
    [
      ["A", "B", "A"],
      [true, true, true],
    ],
    [
      ["A", "B", "A", "A"],
      [true, true, true, false],
    ],
    [
      ["A", null, "A"],
      [true, false, true],
    ],
  ]) {
    test(`Part ${part}: consecutive context ${sequence.join("–")}`, () => {
      const items = sequence.map((_, i) => ({ questionId: `q${i}` }));
      const questions = new Map(sequence.map((passageId, i) => [`q${i}`, { passageId, part }]));
      const rows = orderedContent(items, questions);
      assert.deepEqual(
        rows.map((row) => row.firstInPassage),
        expected,
      );
      assert.deepEqual(
        rows.map((row) => row.questionId),
        items.map((item) => item.questionId),
      );
      assert.deepEqual(
        rows.map((row) => row.number),
        sequence.map((_, i) => i + 1),
      );
    });
  }
}

test("unavailable question retains its position and breaks a passage group", () => {
  const rows = orderedContent(
    [{ questionId: "a" }, { questionId: "missing" }, { questionId: "c" }],
    new Map([
      ["a", { passageId: "A" }],
      ["c", { passageId: "A" }],
    ]),
  );
  assert.equal(rows[1].question, undefined);
  assert.equal(rows[2].firstInPassage, true);
  assert.equal(rows[2].number, 3);
});

const sources = [
  { id: "a", questionNumber: 131 },
  { id: "b", questionNumber: 132 },
  { id: "c", questionNumber: 133 },
  { id: "unknown", questionNumber: null },
];
test("Part 6 full, partial and reordered selections use source identity", () => {
  const full = blankLabels(
    sources,
    new Map([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]),
  );
  assert.equal(full(131, 0).label, "1");
  assert.equal(full(133, 2).label, "3");
  const partial = blankLabels(
    sources,
    new Map([
      ["c", "1"],
      ["a", "2"],
    ]),
  );
  assert.equal(partial(131, 0).label, "2");
  assert.equal(partial(132, 1).label, "132");
  assert.equal(partial(133, 2).label, "1");
  assert.equal(partial(4, 3).label, "4");
});
test("unknown and ambiguous source numbers never map by selection position", () => {
  const label = blankLabels(
    [...sources, { id: "duplicate", questionNumber: 131 }],
    new Map([
      ["a", "1"],
      ["unknown", "2"],
    ]),
  );
  assert.equal(label(131, 0).label, "131");
  assert.equal(label(13, 1).label, "13");
});
test("bank complete-source preview preserves local index fallback and active label", () => {
  const label = blankLabels(
    sources,
    new Map([
      ["a", "131"],
      ["unknown", "4"],
    ]),
    "a",
    true,
  );
  assert.deepEqual(label(13, 0), { label: "131", active: true });
  assert.deepEqual(label(16, 3), { label: "4", active: false });
});
test("supported numbered text formats preserve source numbers for mapping", () => {
  for (const value of ["____131____", "____[131]", "____(131)____"]) {
    assert.ok(
      tokenizeText(value, false).some((token) => token.kind === "blank" && token.number === 131),
    );
  }
});
test("multiple passages have independent blank labels and media remains parsed safely", () => {
  const label = blankLabels([{ id: "x", questionNumber: 131 }], new Map([["x", "9"]]));
  assert.equal(label(131, 0).label, "9");
  assert.deepEqual(mediaUrls("https://example.com/a.png<image_split>https://example.com/b.png"), [
    "https://example.com/a.png",
    "https://example.com/b.png",
  ]);
  assert.deepEqual(mediaUrls("javascript:alert(1)"), []);
});

const reduce = (state, type, ids) => selectionReducer(state, { type, ids });
test("refetch synchronizes clean selection including order", () => {
  const state = reduce(selectionState(["a", "b"]), "server", ["b", "a", "c"]);
  assert.deepEqual(state.ids, ["b", "a", "c"]);
  assert.deepEqual(state.saved, state.ids);
});
test("another tab's refetch preserves a dirty reorder/add/remove until explicit reload", () => {
  let state = reduce(selectionState(["a", "b"]), "edit", ["b", "c"]);
  state = reduce(state, "server", ["x"]);
  assert.deepEqual(state.ids, ["b", "c"]);
  assert.deepEqual(state.saved, ["a", "b"]);
  assert.deepEqual(state.server, ["x"]);
  state = reduce(state, "reload");
  assert.deepEqual(state.ids, ["x"]);
  assert.deepEqual(state.saved, ["x"]);
});
test("successful save updates baseline without overwriting edits made during request", () => {
  let state = reduce(selectionState(["a"]), "edit", ["b", "a"]);
  state = reduce(state, "save");
  state = reduce(state, "edit", ["b", "a", "c"]);
  state = reduce(state, "saved", ["b", "a"]);
  assert.deepEqual(state.saved, ["b", "a"]);
  assert.deepEqual(state.ids, ["b", "a", "c"]);
});
test("failed save retains both draft and saved baseline", () => {
  let state = reduce(selectionState(["a"]), "edit", ["b"]);
  state = reduce(reduce(state, "save"), "failed");
  assert.deepEqual(state.ids, ["b"]);
  assert.deepEqual(state.saved, ["a"]);
});
test("pre-save refetch cannot restore old ordering after save", () => {
  let state = reduce(selectionState(["a", "b"]), "edit", ["b", "a"]);
  state = reduce(state, "save");
  state = reduce(state, "server", ["a", "b"]);
  state = reduce(state, "saved", ["b", "a"]);
  assert.deepEqual(state.server, ["b", "a"]);
  state = reduce(state, "server", ["b", "a"]);
  assert.deepEqual(state.ids, ["b", "a"]);
});
test("newer committed refetch during save remains available without losing local edits", () => {
  let state = reduce(selectionState(["a"]), "edit", ["b"]);
  state = reduce(state, "save");
  state = reduce(state, "server", ["c"]);
  state = reduce(state, "edit", ["b", "d"]);
  state = reduce(state, "saved", ["b"]);
  assert.deepEqual(state.server, ["c"]);
  assert.deepEqual(state.ids, ["b", "d"]);
});

test("a clean picker adopts a newer committed refetch when save finishes", () => {
  let state = reduce(selectionState(["a"]), "edit", ["b"]);
  state = reduce(state, "save");
  state = reduce(state, "server", ["c"]);
  state = reduce(state, "saved", ["b"]);
  assert.deepEqual(state.ids, ["c"]);
  assert.deepEqual(state.saved, ["c"]);
});

test("undoing all local edits adopts the pending server selection", () => {
  let state = reduce(selectionState(["a"]), "edit", ["b"]);
  state = reduce(state, "server", ["c"]);
  state = reduce(state, "edit", ["a"]);
  assert.deepEqual(state.ids, ["c"]);
  assert.deepEqual(state.saved, ["c"]);
});

test("a fresh server response restoring the original IDs during save is still observed", () => {
  let state = selectionState(["a", "b"], 100);
  state = reduce(state, "edit", ["b", "a"]);
  state = reduce(state, "save");
  state = selectionReducer(state, { type: "server", ids: ["a", "b"], observedAt: 200 });
  state = reduce(state, "saved", ["b", "a"]);
  assert.deepEqual(state.ids, ["a", "b"]);
  assert.deepEqual(state.saved, ["a", "b"]);
});
