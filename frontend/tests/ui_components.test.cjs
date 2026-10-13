/* Component unit and contract tests using Node test runner without browser overhead. */
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
  Button,
  IconButton,
  Alert,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Field,
  Spinner,
  EmptyState,
} = require('../src/components/ui/index.ts');

test('Button renders correct variant and size classes', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Button, { variant: 'secondary', size: 'sm' }, 'Action')
  );
  assert.match(html, /ui-button/);
  assert.match(html, /ui-button--secondary/);
  assert.match(html, /ui-button--sm/);
  assert.match(html, />Action<\/span><\/button>/);
});

test('Button loading state sets disabled, aria-busy, and renders spinner', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Button, { loading: true, loadingText: 'Saving...' }, 'Save')
  );
  assert.match(html, /disabled/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /ui-button--loading/);
  assert.match(html, /ui-spinner/);
  assert.match(html, /Saving\.\.\./);
});

test('Button fullWidth modifier is applied', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Button, { fullWidth: true }, 'Full Width')
  );
  assert.match(html, /ui-button--full-width/);
});

test('IconButton renders accessible label, title, and icon', () => {
  const icon = React.createElement('span', { className: 'test-icon' }, '*');
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconButton, { label: 'Close panel', tooltip: 'Close', icon })
  );
  assert.match(html, /aria-label="Close panel"/);
  assert.match(html, /title="Close"/);
  assert.match(html, /class="test-icon"/);
  assert.match(html, /ui-icon-button/);
});

test('Alert sets appropriate semantic role per severity', () => {
  const errorHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Alert, { variant: 'error', title: 'Error occurred' }, 'Details')
  );
  assert.match(errorHtml, /role="alert"/);
  assert.match(errorHtml, /ui-alert--error/);
  assert.match(errorHtml, /Error occurred/);

  const infoHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Alert, { variant: 'info' }, 'Informational note')
  );
  assert.match(infoHtml, /role="status"/);
  assert.match(infoHtml, /ui-alert--info/);
});

test('Alert renders dismiss button with accessible label when onDismiss provided', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Alert, { variant: 'success', onDismiss: () => {} }, 'Saved')
  );
  assert.match(html, /aria-label="Dismiss alert"/);
});

test('Field associates label htmlFor with child input id and renders required indicator', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      Field,
      { id: 'username-field', label: 'Username', required: true },
      React.createElement(Input, { placeholder: 'Enter username' })
    )
  );
  assert.match(html, /for="username-field"/);
  assert.match(html, /id="username-field"/);
  assert.match(html, /ui-field__required/);
});

test('Field renders error message with role="alert" and marks input aria-invalid', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      Field,
      { id: 'email-field', label: 'Email', error: 'Invalid email address' },
      React.createElement(Input, { type: 'email' })
    )
  );
  assert.match(html, /role="alert"/);
  assert.match(html, /Invalid email address/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="email-field-err"/);
});

test('Badge renders variant, dot, and label', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Badge, { variant: 'success', dot: true }, 'Verified')
  );
  assert.match(html, /ui-badge--success/);
  assert.match(html, /ui-badge__dot/);
  assert.match(html, /Verified/);
});

test('Card system renders header, title, description, content, and footer', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      Card,
      { variant: 'elevated' },
      React.createElement(
        CardHeader,
        null,
        React.createElement(CardTitle, null, 'Card Heading'),
        React.createElement(CardDescription, null, 'Subtitle description')
      ),
      React.createElement(CardContent, null, 'Main card body'),
      React.createElement(CardFooter, null, 'Footer actions')
    )
  );
  assert.match(html, /ui-card--elevated/);
  assert.match(html, /ui-card__title/);
  assert.match(html, /Card Heading/);
  assert.match(html, /Subtitle description/);
  assert.match(html, /Main card body/);
  assert.match(html, /Footer actions/);
});

test('Spinner renders status role and accessible label', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Spinner, { label: 'Processing upload...' })
  );
  assert.match(html, /role="status"/);
  assert.match(html, /aria-label="Processing upload\.\.\."/);
  assert.match(html, /ui-spinner/);
});

test('EmptyState renders title and action slot', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(EmptyState, {
      title: 'No items found',
      description: 'Create an item to get started',
      action: React.createElement(Button, null, 'Create item'),
    })
  );
  assert.match(html, /ui-empty-state__title/);
  assert.match(html, /No items found/);
  assert.match(html, /Create an item to get started/);
  assert.match(html, /Create item/);
});
