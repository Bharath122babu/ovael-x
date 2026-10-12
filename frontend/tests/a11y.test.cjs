/* Step 17: Comprehensive Accessibility, Keyboard Navigation & Reduced-Motion Audit tests */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Register ts and tsx compilation for Node CommonJS loader with esModuleInterop
require.extensions['.ts'] = require.extensions['.tsx'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(code, filename);
};

const cssPath = path.resolve(__dirname, '../src/style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const { useFocusTrap, Field, Input, Button, IconButton } = require('../src/components/ui/index.ts');
const { AppShell } = require('../src/components/layout/index.ts');
const { MobileDrawer } = require('../src/components/layout/MobileDrawer.tsx');
const { ActiveSessionWorkspace } = require('../src/components/session/ActiveSessionWorkspace.tsx');
const { EvidenceMetricCard } = require('../src/components/evidence/EvidenceMetricCard.tsx');

test('WCAG 2.2 AA Contrast Tokens: Text colors guarantee >= 4.5:1 contrast ratio', () => {
  assert.match(cssContent, /--color-text-primary:\s*#222222;/);
  assert.match(cssContent, /--color-text-secondary:\s*#3D3D3D;/);
  assert.match(cssContent, /--color-text-muted:\s*#595959;/);
  assert.match(cssContent, /--color-text-subtle:\s*#737373;/);
  assert.match(cssContent, /--color-text-inverse:\s*#FAF3E1;/);
});

test('Focus Visibility: High-contrast focus ring and skip-to-content link', () => {
  assert.match(cssContent, /--color-focus-ring:\s*#FF6D1F;/);
  assert.match(cssContent, /\.skip-link:focus\s*\{[^}]*position:\s*fixed;/s);
  assert.match(cssContent, /:focus-visible\s*\{[^}]*outline:\s*2px\s*solid\s*var\(--color-focus-ring\);/s);
});

test('High-Contrast Mode: forced-colors active rules provide distinct boundaries', () => {
  assert.match(cssContent, /@media\s*\(forced-colors:\s*active\)\s*\{/);
  assert.match(cssContent, /outline:\s*3px\s*solid\s*Highlight\s*!important;/);
  assert.match(cssContent, /border:\s*1px\s*solid\s*ButtonText\s*!important;/);
});

test('Reduced Motion: prefers-reduced-motion neutralizes animations and spatial transforms', () => {
  const rmIndex = cssContent.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(rmIndex !== -1, 'prefers-reduced-motion block must exist');
  const rmCss = cssContent.slice(rmIndex);
  assert.match(rmCss, /animation-duration:\s*0\.01ms\s*!important;/);
  assert.match(rmCss, /transition-duration:\s*0\.01ms\s*!important;/);
  assert.match(rmCss, /transform:\s*none\s*!important;/);
  assert.match(rmCss, /\.ui-skeleton/);
  assert.match(rmCss, /\.speech-listening-indicator/);
  assert.match(rmCss, /\.adaptive-motif__scene/);
});

test('Focus Management: useFocusTrap hook is exported from UI utils', () => {
  assert.equal(typeof useFocusTrap, 'function');
});

test('AppShell Semantics: Skip link references main content landmark with tabindex -1', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AppShell, {
      view: 'learn',
      user: { username: 'alex' },
      onNavigate: () => {},
      onLogout: () => {},
    }, React.createElement('div', null, 'Content'))
  );

  assert.match(html, /<a[^>]*href="#main-content"[^>]*class="skip-link sr-only"/);
  assert.match(html, /<main[^>]*id="main-content"[^>]*tabIndex="-1"|<main[^>]*id="main-content"[^>]*tabindex="-1"/);
});

test('MobileDrawer Accessibility: Renders modal dialog with aria-modal and aria-current', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MobileDrawer, {
      isOpen: true,
      onClose: () => {},
      view: 'courses',
      onNavigate: () => {},
      user: { username: 'alex' },
      onLogout: () => {},
    })
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="Navigation menu"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /aria-label="Close navigation menu"/);
});

test('ActiveSessionWorkspace Accessibility: Region timeline and polite atomic live announcements', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ActiveSessionWorkspace, {
      courseName: 'Biochemistry',
      conceptName: 'Glycolysis',
      messages: [{ who: 'system', text: 'What is the net ATP yield of glycolysis?' }],
      user: { username: 'alex' },
      onLeaveSession: () => {},
      composerSlot: React.createElement('div', null, 'Composer'),
    })
  );

  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Conversation timeline"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-atomic="true"/);
  assert.match(html, /New tutor turn: What is the net ATP yield of glycolysis\?/);
});

test('EvidenceMetricCard Accessibility: Region with composite accessible aria-label', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(EvidenceMetricCard, {
      icon: React.createElement('span', null, '*'),
      label: 'Verified Concepts',
      value: 14,
      description: 'Concepts with independent proof of mastery',
    })
  );

  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Verified Concepts: 14\. Concepts with independent proof of mastery"/);
});

test('Form Field Accessibility: Associates label, description, and announces role alert error', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      Field,
      {
        id: 'user-input',
        label: 'Username',
        description: 'Choose a unique learner username',
        error: 'Username must be at least 3 characters',
        required: true,
      },
      React.createElement(Input, { placeholder: 'Enter username' })
    )
  );

  assert.match(html, /for="user-input"/);
  assert.match(html, /id="user-input-desc"/);
  assert.match(html, /id="user-input-err"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="[^"]*user-input-desc[^"]*user-input-err[^"]*"/);
});
