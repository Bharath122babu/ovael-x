/* Step 15: Selective 3D Design, Depth & Visual Storytelling tests using Node test runner. */
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

const { AdaptiveLearningMotif } = require('../src/components/visuals/index.ts');

test('Depth & Material Tokens: Perspective and optics are defined', () => {
  assert.match(cssContent, /--depth-perspective:\s*1000px;/);
  assert.match(cssContent, /--depth-perspective-subtle:\s*1400px;/);
});

test('Depth & Material Tokens: Directional highlights and bevels are calibrated', () => {
  assert.match(cssContent, /--depth-highlight-top:\s*inset 0 1px 0 rgba\(255, 255, 255, 0\.7\);/);
  assert.match(cssContent, /--depth-highlight-edge:\s*inset 0 0 0 1px rgba\(255, 255, 255, 0\.2\);/);
  assert.match(cssContent, /--depth-bevel:/);
  assert.match(cssContent, /--depth-bevel-dark:/);
});

test('Depth & Material Tokens: Ambient and dimensional shadows are defined', () => {
  assert.match(cssContent, /--depth-shadow-subtle:/);
  assert.match(cssContent, /--depth-shadow-ambient:/);
  assert.match(cssContent, /--depth-shadow-elevated:/);
  assert.match(cssContent, /--depth-shadow-brand:/);
  assert.match(cssContent, /--depth-lift-sm:\s*translateY\(-2px\);/);
});

test('Dimensional Surface Utilities: Surface classes apply calibrated depth', () => {
  assert.match(cssContent, /\.ui-surface--raised\s*\{[^}]*--depth-shadow-ambient/s);
  assert.match(cssContent, /\.ui-surface--elevated\s*\{[^}]*--depth-shadow-elevated/s);
  assert.match(cssContent, /\.ui-surface--bevel\s*\{[^}]*--depth-bevel/s);
});

test('Selective UI Depth: Brand mark, course cards, and setup panel receive dimensional styling', () => {
  assert.match(cssContent, /\.brand-mark\s*\{[^}]*inset 0 1px 0/s);
  assert.match(cssContent, /\.course-card\s*\{[^}]*--depth-highlight-top/s);
  assert.match(cssContent, /\.course-card:hover\s*\{[^}]*--depth-lift-sm/s);
  assert.match(cssContent, /\.course-card--selected\s*\{[^}]*--depth-shadow-brand/s);
  assert.match(cssContent, /\.session-setup-panel\s*\{[^}]*--depth-highlight-top/s);
});

test('Motif Scene & Animation: Keyframes and perspective scene declared', () => {
  assert.match(cssContent, /\.adaptive-motif\s*\{[^}]*perspective:\s*var\(--depth-perspective\)/s);
  assert.match(cssContent, /\.adaptive-motif__scene\s*\{[^}]*transform-style:\s*preserve-3d/s);
  assert.match(cssContent, /@keyframes motifNodePulse\s*\{/);
  assert.match(cssContent, /@keyframes motifDataFlow\s*\{/);
  assert.match(cssContent, /\.motif-pulse-node\s*\{[^}]*animation:\s*motifNodePulse/s);
  assert.match(cssContent, /\.motif-data-link\s*\{[^}]*animation:\s*motifDataFlow/s);
});

test('Motif Mobile Behavior: Compact motif is cleanly hidden on narrow screens to avoid crowding', () => {
  assert.match(cssContent, /@media\s*\(max-width:\s*640px\)\s*\{[^}]*\.page-heading__actions\s+\.adaptive-motif--compact\s*\{[^}]*display:\s*none;/s);
});

test('Accessibility & Reduced Motion: Neutralizes 3D transforms, perspective, and animations', () => {
  const reducedMotionIndex = cssContent.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(reducedMotionIndex !== -1, 'prefers-reduced-motion block must exist');
  const reducedMotionCss = cssContent.slice(reducedMotionIndex);
  assert.match(reducedMotionCss, /\.motif-pulse-node/);
  assert.match(reducedMotionCss, /\.motif-data-link/);
  assert.match(reducedMotionCss, /\.adaptive-motif__scene/);
  assert.match(reducedMotionCss, /animation:\s*none\s*!important;/);
  assert.match(reducedMotionCss, /transform:\s*none\s*!important;/);
});

test('AdaptiveLearningMotif: Renders accessible role, semantic label, and SVG structure', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AdaptiveLearningMotif, { variant: 'compact' })
  );
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="Conceptual dimensional diagram of interconnected adaptive learning pathways"/);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.match(html, /adaptive-motif--compact/);
  assert.match(html, /polygon/);
  assert.match(html, /motif-pulse-node/);
  assert.match(html, /motif-data-link/);
});

test('AdaptiveLearningMotif: Supports standard and card variants with custom label', () => {
  const htmlStandard = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AdaptiveLearningMotif, {
      variant: 'standard',
      ariaLabel: 'Abstract knowledge model',
    })
  );
  assert.match(htmlStandard, /adaptive-motif--standard/);
  assert.match(htmlStandard, /aria-label="Abstract knowledge model"/);

  const htmlCard = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AdaptiveLearningMotif, { variant: 'card' })
  );
  assert.match(htmlCard, /adaptive-motif--card/);
});

const {
  OrbitMotionVisual,
  ProgressionMotionVisual,
  MechanismMotionVisual,
} = require('../src/components/visuals/index.ts');

test('Signature Motion Concept A (OrbitMotionVisual): Renders 2.5D elliptical track, sphere, and synchronized shadow', () => {
  const htmlDecorative = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OrbitMotionVisual, { size: 'sm', active: true, loop: true, decorative: true })
  );
  assert.match(htmlDecorative, /ovael-orbit--sm/);
  assert.match(htmlDecorative, /ovael-orbit--loop/);
  assert.match(htmlDecorative, /aria-hidden="true"/);
  assert.match(htmlDecorative, /ovael-orbit__traveler/);
  assert.match(htmlDecorative, /ovael-orbit__seam/);
  assert.match(htmlDecorative, /#FF6D1F/);
  assert.match(htmlDecorative, /#FAF3E1/);

  const htmlStatus = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OrbitMotionVisual, { size: 'md', active: true, loop: true, decorative: false, label: 'Evaluating turn' })
  );
  assert.match(htmlStatus, /role="status"/);
  assert.match(htmlStatus, /aria-label="Evaluating turn"/);
});

test('Signature Motion Concept B (ProgressionMotionVisual): Renders 2.5D curved channel, stations, and rolling sphere without fake metrics', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProgressionMotionVisual, { variant: 'editorial', active: false })
  );
  assert.match(html, /ovael-progression--editorial/);
  assert.match(html, /auth-editorial-motif__trajectory/);
  assert.match(html, /ovael-progression__sphere-rig/);
  assert.match(html, /ovael-progression__sphere-roll/);
  assert.match(html, /auth-editorial-motif__anchor--origin/);
  assert.match(html, /auth-editorial-motif__anchor--inflection/);
  assert.match(html, /auth-editorial-motif__anchor--destination/);
  assert.doesNotMatch(html, /<text|mastery|score/i);
});

test('Signature Motion Concept C (MechanismMotionVisual): Renders 2.5D channel, pivoting rocker bar, and sphere states', () => {
  const htmlIdle = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MechanismMotionVisual, { variant: 'compact', state: 'idle' })
  );
  assert.match(htmlIdle, /ovael-mechanism--compact/);
  assert.match(htmlIdle, /ovael-mechanism--idle/);
  assert.match(htmlIdle, /ovael-mechanism__rocker/);
  assert.match(htmlIdle, /ovael-mechanism__sphere/);

  const htmlSettled = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MechanismMotionVisual, { variant: 'inline', state: 'settled' })
  );
  assert.match(htmlSettled, /ovael-mechanism--inline/);
  assert.match(htmlSettled, /ovael-mechanism--settled/);
});

test('Custom Login SVG Cursor: Compact 20x20 solid Electric Tangerine pointer with 1 1 hotspot scoped to auth page', () => {
  const cursorSvgPath = path.resolve(__dirname, '../public/assets/ovael-login-cursor.svg');
  const cursorSvg = fs.readFileSync(cursorSvgPath, 'utf8');
  assert.match(cursorSvg, /width="20"\s+height="20"\s+viewBox="0 0 20 20"/);
  assert.match(cursorSvg, /fill="#FF6D1F"/);
  assert.match(cursorSvg, /stroke-linejoin="round"/);
  assert.match(cssContent, /cursor:\s*url\("\/assets\/ovael-login-cursor\.svg"\)\s*1\s+1,\s*default;/);
  assert.match(cssContent, /cursor:\s*url\("\/assets\/ovael-login-cursor-pointer\.svg"\)\s*1\s+1,\s*pointer;/);
});

test('Login Page SVG Motion Overhaul: Sub-1.1s entrance choreography, single-layer orange stroke draw, and auth-state independence', () => {
  assert.match(cssContent, /--auth-motion-draw:\s*0\.84s;/);
  assert.match(cssContent, /--auth-motion-travel:\s*0\.84s;/);
  assert.match(cssContent, /\.auth-editorial-motif__trajectory\s*\{[^}]*stroke-dasharray:\s*100;[^}]*animation:\s*drawTrajectory/s);
  assert.match(cssContent, /\.auth-editorial-motif__anchor--origin\s*\{[^}]*0\.06s\s+backwards;/s);
  assert.match(cssContent, /\.auth-editorial-motif__anchor--inflection\s*\{[^}]*0\.42s\s+backwards;/s);
  assert.match(cssContent, /\.auth-editorial-motif__anchor--destination\s*\{[^}]*0\.82s\s+backwards;/s);
});


