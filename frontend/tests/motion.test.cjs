/* Global Motion Design System & Microinteractions contract and styling tests using Node test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.resolve(__dirname, '../src/style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

test('Motion Design Tokens: Durations are defined with calibrated values', () => {
  assert.match(cssContent, /--motion-duration-fast:\s*120ms;/);
  assert.match(cssContent, /--motion-duration-normal:\s*200ms;/);
  assert.match(cssContent, /--motion-duration-medium:\s*300ms;/);
  assert.match(cssContent, /--motion-duration-slow:\s*450ms;/);
});

test('Motion Design Tokens: Easings are defined with cubic-bezier curves', () => {
  assert.match(cssContent, /--motion-ease-standard:\s*cubic-bezier\(0\.2,\s*0,\s*0,\s*1\);/);
  assert.match(cssContent, /--motion-ease-enter:\s*cubic-bezier\(0,\s*0,\s*0\.2,\s*1\);/);
  assert.match(cssContent, /--motion-ease-exit:\s*cubic-bezier\(0\.4,\s*0,\s*1,\s*1\);/);
  assert.match(cssContent, /--motion-ease-spring:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/);
});

test('Motion Design Tokens: Microinteraction distances are calibrated', () => {
  assert.match(cssContent, /--motion-distance-xs:\s*1px;/);
  assert.match(cssContent, /--motion-distance-sm:\s*4px;/);
  assert.match(cssContent, /--motion-distance-md:\s*8px;/);
  assert.match(cssContent, /--motion-distance-lg:\s*16px;/);
});

test('Motion Design Tokens: Legacy token aliases are maintained for backwards compatibility', () => {
  assert.match(cssContent, /--duration-fast:\s*var\(--motion-duration-fast\);/);
  assert.match(cssContent, /--duration-normal:\s*var\(--motion-duration-normal\);/);
  assert.match(cssContent, /--duration-slow:\s*var\(--motion-duration-medium\);/);
  assert.match(cssContent, /--ease-standard:\s*var\(--motion-ease-standard\);/);
});

test('Motion Keyframes: Essential entrance and exit animations are declared', () => {
  assert.match(cssContent, /@keyframes fadeIn\s*\{/);
  assert.match(cssContent, /@keyframes modalEntrance\s*\{/);
  assert.match(cssContent, /@keyframes drawerSlideInRight\s*\{/);
  assert.match(cssContent, /@keyframes toastEntrance\s*\{/);
  assert.match(cssContent, /@keyframes chatTurnEntrance\s*\{/);
  assert.match(cssContent, /@keyframes popoverEntrance\s*\{/);
});

test('Button & Control Microinteractions: Buttons utilize tokenized transitions and active micro-press', () => {
  assert.match(cssContent, /\.ui-button\s*\{[^}]*transition:[^}]*--motion-duration-fast/s);
  assert.match(cssContent, /\.ui-button:active:not\(:disabled\),\s*\.ui-icon-button:active:not\(:disabled\)\s*\{[^}]*translateY\(var\(--motion-distance-xs\)\)/s);
});

test('Sidebar & Navigation Microinteractions: Drawer and collapse use motion tokens', () => {
  assert.match(cssContent, /\.app-sidebar\s*\{[^}]*transition:[^}]*--motion-duration-medium/s);
  assert.match(cssContent, /\.nav-item,\s*\.app-nav__item\s*\{[^}]*transition:[^}]*--motion-duration-fast/s);
});

test('Tutoring Workspace & Chat Turns: Entrance microinteractions are configured', () => {
  assert.match(cssContent, /\.tutor-turn,\s*\.learner-turn,\s*\.session-message-bubble\s*\{[^}]*animation:\s*chatTurnEntrance/s);
});

test('Modal Dialogs & Toasts: Overlay and content entrances use standard easing', () => {
  assert.match(cssContent, /\.modal-dialog[^}]*animation:\s*modalEntrance/s);
  assert.match(cssContent, /\.notification-toast\s*\{[^}]*animation:\s*toastEntrance/s);
});

test('Accessibility & Reduced-Motion: prefers-reduced-motion neutralizes durations and transforms', () => {
  assert.match(cssContent, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
  assert.match(cssContent, /animation-duration:\s*0\.01ms\s*!important;/);
  assert.match(cssContent, /transition-duration:\s*0\.01ms\s*!important;/);
  assert.match(cssContent, /transform:\s*none\s*!important;/);
  assert.match(cssContent, /\.ui-skeleton/);
  assert.match(cssContent, /\.spin-icon/);
  assert.match(cssContent, /\.speech-listening-indicator/);
});
