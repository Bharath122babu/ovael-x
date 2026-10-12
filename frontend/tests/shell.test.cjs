/* App Shell, Sidebar, and Navigation tests using Node test runner without browser overhead. */
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

const {
  Sidebar,
  TopBar,
  MobileDrawer,
  PageHeader,
  AppShell,
  NAV_ITEMS,
} = require('../src/components/layout/index.ts');

const mockUser = { username: 'testuser', role: 'learner' };

test('NAV_ITEMS contains all supported primary destinations', () => {
  const ids = NAV_ITEMS.map((item) => item.id);
  assert.deepEqual(ids, ['learn', 'courses', 'insights', 'settings']);
});

test('Sidebar renders all primary navigation destinations and marks active page', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Sidebar, {
      view: 'learn',
      collapsed: false,
      user: mockUser,
      onToggleCollapse: () => {},
      onNavigate: () => {},
      onLogout: () => {},
    })
  );

  assert.match(html, /Learn/);
  assert.match(html, /My courses/);
  assert.match(html, /Learning evidence/);
  assert.match(html, /Settings/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /testuser/);
  assert.match(html, /Local-first learning/);
});

test('Sidebar in collapsed mode preserves accessible labels and toggles aria-expanded', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Sidebar, {
      view: 'courses',
      collapsed: true,
      user: mockUser,
      onToggleCollapse: () => {},
      onNavigate: () => {},
      onLogout: () => {},
    })
  );

  assert.match(html, /sidebar collapsed/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /title="Expand sidebar"/);
  assert.match(html, /aria-label="My courses"/);
});

test('TopBar renders breadcrumb with current view title and system badge', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TopBar, {
      view: 'insights',
      user: mockUser,
      onOpenMobile: () => {},
      onOpenSettings: () => {},
    })
  );

  assert.match(html, /Workspace/);
  assert.match(html, /Learning evidence/);
  assert.match(html, /Decision \+ AI v5/);
  assert.match(html, /Signed in as testuser/);
});

test('TopBar renders contextual active course and topic when available', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TopBar, {
      view: 'learn',
      user: mockUser,
      activeCourseName: 'Cell Biology',
      activeConceptName: 'Mitochondria',
      isSessionActive: true,
      onOpenMobile: () => {},
      onOpenSettings: () => {},
    })
  );

  assert.match(html, /Cell Biology/);
  assert.match(html, /Mitochondria/);
});

test('MobileDrawer does not render when closed', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MobileDrawer, {
      isOpen: false,
      onClose: () => {},
      view: 'learn',
      onNavigate: () => {},
      user: mockUser,
      onLogout: () => {},
    })
  );

  assert.equal(html, '');
});

test('MobileDrawer renders accessible dialog and close trigger when open', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MobileDrawer, {
      isOpen: true,
      onClose: () => {},
      view: 'learn',
      onNavigate: () => {},
      user: mockUser,
      onLogout: () => {},
    })
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="Navigation menu"/);
  assert.match(html, /aria-label="Close navigation menu"/);
  assert.match(html, /mobile-drawer-backdrop/);
});

test('PageHeader renders title, description, and optional eyebrow', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(PageHeader, {
      eyebrow: 'COURSE MANAGEMENT',
      title: 'Your Courses',
      description: 'Manage learning materials and topics.',
    })
  );

  assert.match(html, /COURSE MANAGEMENT/);
  assert.match(html, /Your Courses/);
  assert.match(html, /Manage learning materials and topics\./);
});

test('AppShell renders skip-to-content link, sidebar, topbar, and children', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      AppShell,
      {
        view: 'learn',
        user: mockUser,
        onNavigate: () => {},
        onLogout: () => {},
      },
      React.createElement('div', { id: 'test-content' }, 'Main Learning Content')
    )
  );

  assert.match(html, /href="#main-content"/);
  assert.match(html, /Skip to main content/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /Main Learning Content/);
});
