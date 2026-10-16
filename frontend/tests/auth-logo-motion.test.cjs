const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { readStyles } = require("./helpers/readStyles.cjs");

const authScreen = fs.readFileSync(
  path.resolve(__dirname, "../src/components/auth/AuthScreen.tsx"),
  "utf8",
);
const styles = readStyles();

test("auth logo retains the O mark and exact OVAEL-X wordmark", () => {
  assert.match(authScreen, /className="auth-brand-mark-glyph">O<\/span>/);
  assert.match(authScreen, /className="brand-name auth-brand-wordmark">OVAEL-X<\/span>/);
  assert.match(authScreen, /className="auth-brand-mark-svg"/);
});

test("SVG stroke, warm highlight, and wordmark reveals are deliberately staged", () => {
  assert.match(styles, /animation: authBrandStrokeReveal 400ms var\(--ease-out\) 20ms both/);
  assert.match(styles, /animation: authBrandGlintReveal 280ms var\(--ease-out\) 420ms both/);
  assert.match(styles, /animation: authWordmarkReveal 340ms var\(--ease-out\) 80ms both/);
});

test("login entrance is not restarted when switching authentication modes", () => {
  assert.doesNotMatch(authScreen, /setIsEnteringLogin\(true\)/);
  assert.match(authScreen, /if \(nextMode !== "login" \|\| prefersReduced\)/);
});

test("reduced-motion preferences and the in-app motion setting keep the brand static", () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.reduce-motion \.auth-brand-mark/);
  assert.match(styles, /\.auth-brand-mini:hover \.auth-brand-mark \{\s*transform: none !important;/);
  assert.match(styles, /stroke-dashoffset: 0 !important/);
});

test("logo framing and wordmark use the existing theme-aware brand tokens", () => {
  assert.match(styles, /\.brand-mark\s*\{[\s\S]*?background: var\(--brand-navy\);[\s\S]*?color: var\(--brand-yellow\);/);
  assert.match(styles, /\.brand-name\s*\{[\s\S]*?color: var\(--text-heading\);/);
});
