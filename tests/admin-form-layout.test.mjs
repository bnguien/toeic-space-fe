import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const rule = (css, selector) =>
  css.match(new RegExp(`(?:^|\\n)\\s*${selector}\\s*\\{([^}]*)\\}`, "m"))?.[1] ?? "";

const schedules = read("modules/admin/components/ClassSchedules.module.css");
const defaultRoom = read("modules/admin/components/ClassDefaultRoom.module.css");
const classes = read("modules/admin/pages/ClassesPage.module.css");
const facilities = read("modules/admin/pages/FacilitiesPage.module.css");
const adminForm = read("modules/admin/components/adminForm.module.css");
const select = read("shared/components/Select/Select.module.css");
const modal = read("modules/admin/components/ui/ui.module.css");
const teacherForm = read("modules/teacher/components/TeacherSessionForm.module.css");

test("periodic schedule rows shrink instead of being pushed out by a long teacher name", () => {
  assert.match(rule(schedules, "\\.formGrid"), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(
    rule(schedules, "\\.formRow2"),
    /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/,
  );
  assert.match(rule(schedules, "\\.formField"), /min-width:\s*0/);
});

test("default-room dialogs constrain the select and let the checkbox label wrap", () => {
  assert.match(rule(defaultRoom, "\\.dialogForm"), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(rule(defaultRoom, "\\.dialogField"), /min-width:\s*0/);
  assert.match(rule(defaultRoom, "\\.checkboxRow"), /align-items:\s*flex-start/);
  assert.match(defaultRoom, /\.checkboxRow span\s*\{[^}]*min-width:\s*0/);
});

test("two-column admin forms keep equal tracks with long select values", () => {
  const form = rule(classes, "\\.formGrid");
  assert.match(form, /repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(rule(classes, "\\.formGrid label"), /min-width:\s*0/);
  assert.match(rule(facilities, "\\.formGrid"), /minmax\(0,\s*1fr\)/);
  assert.match(rule(facilities, "\\.formField"), /min-width:\s*0/);
});

test("shared form sections and checkbox rows cannot widen a modal", () => {
  assert.match(rule(adminForm, "\\.form"), /minmax\(0,\s*1fr\)/);
  assert.match(rule(adminForm, "\\.section"), /min-width:\s*0/);
  assert.match(rule(adminForm, "\\.checkRow"), /align-items:\s*flex-start/);
  assert.match(rule(teacherForm, "\\.form"), /minmax\(0,\s*1fr\)/);
  assert.match(rule(teacherForm, "\\.row"), /repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test("the shared select truncates long selected and option labels", () => {
  assert.match(rule(select, "\\.trigger"), /min-width:\s*0/);
  assert.match(rule(select, "\\.selectedLabel"), /min-width:\s*0/);
  assert.match(rule(select, "\\.selectedLabel"), /text-overflow:\s*ellipsis/);
  assert.match(rule(select, "\\.optionLabel"), /min-width:\s*0/);
});

test("modals let long content shrink and tall forms scroll", () => {
  assert.match(rule(modal, "\\.modal"), /overflow-y:\s*auto/);
  assert.match(rule(modal, "\\.modalBody"), /min-width:\s*0/);
  assert.match(modal, /\.modalBody > \*[^{]*\{[^}]*min-width:\s*0/);
  assert.match(rule(modal, "\\.modalHeader h2"), /min-width:\s*0/);
});
