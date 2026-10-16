/* Step 4 Smoke Tests: Verify that all decomposed components export valid functions */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Register .ts and .tsx extensions so nested imports resolve cleanly in node --test
require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  module._compile(compiled, filename);
};
require.extensions[".tsx"] = require.extensions[".ts"];

test("settings screen decomposed modules export component functions", () => {
  const base = path.resolve(__dirname, "../src/components/learner/screens/settings");
  const files = [
    "SettingsSidebar.tsx",
    "ProfileTab.tsx",
    "PersonalizationTab.tsx",
    "SecurityTab.tsx",
    "AccessibilityTab.tsx",
    "DataTab.tsx",
    "ServicesTab.tsx",
  ];
  for (const f of files) {
    const fullPath = path.join(base, f);
    assert.ok(fs.existsSync(fullPath), `${f} must exist`);
    const exports = require(fullPath);
    const componentName = f.replace(".tsx", "");
    assert.equal(typeof exports[componentName], "function", `${f} must export ${componentName} component`);
  }
});

test("materials screen decomposed modules export component functions and helpers", () => {
  const base = path.resolve(__dirname, "../src/components/learner/screens/materials");
  const helpers = require(path.join(base, "materialsHelpers.ts"));
  assert.equal(typeof helpers.bytes, "function");
  assert.equal(typeof helpers.launchFor, "function");
  assert.equal(typeof helpers.getFileCategory, "function");

  const components = [
    ["MaterialUploadZone.tsx", "MaterialUploadZone"],
    ["MaterialFilterBar.tsx", "MaterialFilterBar"],
    ["MaterialCard.tsx", "MaterialCard"],
    ["MaterialTableView.tsx", "MaterialTableView"],
    ["MaterialInspectorModal.tsx", "MaterialInspectorModal"],
  ];
  for (const [file, name] of components) {
    const exports = require(path.join(base, file));
    assert.equal(typeof exports[name], "function", `${file} must export ${name}`);
  }
});

test("courses screen decomposed modules export component functions", () => {
  const base = path.resolve(__dirname, "../src/components/learner/screens/courses");
  const components = [
    ["CourseFilterBar.tsx", "CourseFilterBar"],
    ["CourseCard.tsx", "CourseCard"],
    ["CourseList.tsx", "CourseList"],
    ["CourseCreateModal.tsx", "CourseCreateModal"],
    ["CourseDetailDrawer.tsx", "CourseDetailDrawer"],
  ];
  for (const [file, name] of components) {
    const exports = require(path.join(base, file));
    assert.equal(typeof exports[name], "function", `${file} must export ${name}`);
  }
});

test("learn screen decomposed modules export component functions", () => {
  const base = path.resolve(__dirname, "../src/components/learner/screens/learn");
  const components = [
    ["LearnHeader.tsx", "LearnHeader"],
    ["TurnCard.tsx", "TurnCard"],
    ["AnswerInputs.tsx", "AnswerInputs"],
    ["Composer.tsx", "Composer"],
    ["MessageList.tsx", "MessageList"],
  ];
  for (const [file, name] of components) {
    const exports = require(path.join(base, file));
    assert.equal(typeof exports[name], "function", `${file} must export ${name}`);
  }
});

test("teacher workspace decomposed modules export component functions", () => {
  const base = path.resolve(__dirname, "../src/components/teacher");
  const components = [
    ["TeacherHeader.tsx", "TeacherHeader"],
    ["TeacherOnboarding.tsx", "TeacherOnboarding"],
    ["tabs/OverviewTab.tsx", "OverviewTab"],
    ["tabs/RosterTab.tsx", "RosterTab"],
    ["tabs/TeacherMaterialsTab.tsx", "TeacherMaterialsTab"],
    ["tabs/CurriculumGraphTab.tsx", "CurriculumGraphTab"],
    ["tabs/ForensicGapsTab.tsx", "ForensicGapsTab"],
    ["modals/CreateCourseModal.tsx", "CreateCourseModal"],
    ["modals/EditCourseModal.tsx", "EditCourseModal"],
    ["modals/DeleteCourseModal.tsx", "DeleteCourseModal"],
    ["modals/UnenrollModal.tsx", "UnenrollModal"],
    ["modals/ProposeGraphModal.tsx", "ProposeGraphModal"],
  ];
  for (const [relPath, name] of components) {
    const exports = require(path.join(base, relPath));
    assert.equal(typeof exports[name], "function", `${relPath} must export ${name}`);
  }
});
