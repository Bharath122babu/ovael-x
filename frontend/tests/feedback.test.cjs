/* Global Feedback, Notifications, Skeletons & Recovery UI tests using Node test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
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
  formatApiError,
  NotificationToast,
  NotificationViewport,
  RetryableError,
  SkeletonText,
  SkeletonCard,
  SkeletonRow,
  SkeletonTable,
} = require('../src/components/feedback/index.ts');

const { EmptyState } = require('../src/components/ui/index.ts');

test('formatApiError: detects network connection errors safely without crashing', () => {
  const netErr1 = new Error('Cannot reach OVAEL backend. Start FastAPI on port 8000 and retry.');
  const parsed1 = formatApiError(netErr1);
  assert.equal(parsed1.isNetworkError, true);
  assert.equal(parsed1.isRecoverable, true);
  assert.match(parsed1.message, /Unable to reach the OVAEL server/);

  const netErr2 = new TypeError('Failed to fetch');
  const parsed2 = formatApiError(netErr2);
  assert.equal(parsed2.isNetworkError, true);
  assert.equal(parsed2.isRecoverable, true);
});

test('formatApiError: translates HTTP status codes into clear human messages', () => {
  const e401 = formatApiError(new Error('401 Unauthorized'));
  assert.match(e401.message, /Your session has expired/);
  assert.equal(e401.isRecoverable, false);

  const e403 = formatApiError(new Error('403 Forbidden'));
  assert.match(e403.message, /do not have permission/);

  const e404 = formatApiError(new Error('404 Not Found'));
  assert.match(e404.message, /could not be found/);

  const e413 = formatApiError(new Error('413 Payload Too Large'));
  assert.match(e413.message, /exceeds the allowed server upload size limit/);

  const e422 = formatApiError(new Error('422 Unprocessable Entity'));
  assert.match(e422.message, /Validation failed/);

  const e503 = formatApiError(new Error('503 Service Unavailable'));
  assert.match(e503.message, /temporarily unavailable/);
  assert.equal(e503.isRecoverable, true);
});

test('formatApiError: cleans raw tracebacks and prevents sensitive internal dumps', () => {
  const tracebackErr = new Error('Traceback (most recent call last):\n  File "server.py", line 42\nException: secret DB key missing');
  const parsed = formatApiError(tracebackErr);
  assert.doesNotMatch(parsed.message, /Traceback/);
  assert.doesNotMatch(parsed.message, /secret DB key/);
  assert.match(parsed.message, /Internal server operation failed/);
});

test('NotificationToast: renders success toast with status role and polite live region', () => {
  const notif = {
    id: 'n1',
    message: 'Course created successfully.',
    severity: 'success',
    title: 'Success',
    createdAt: Date.now(),
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(NotificationToast, {
      notification: notif,
      onDismiss: () => {},
    })
  );

  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /notification-toast--success/);
  assert.match(html, /Course created successfully\./);
  assert.match(html, /Success/);
  assert.match(html, /aria-label="Dismiss notification"/);
});

test('NotificationToast: renders error toast with alert role and assertive live region', () => {
  const notif = {
    id: 'n2',
    message: 'Document extraction failed due to unsupported encoding.',
    severity: 'error',
    title: 'Extraction Error',
    action: {
      label: 'Retry Document',
      onClick: () => {},
    },
    createdAt: Date.now(),
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(NotificationToast, {
      notification: notif,
      onDismiss: () => {},
    })
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /aria-live="assertive"/);
  assert.match(html, /notification-toast--error/);
  assert.match(html, /Document extraction failed/);
  assert.match(html, /Retry Document/);
});

test('NotificationViewport: renders notification region when items present and null when empty', () => {
  const emptyHtml = ReactDOMServer.renderToString(
    React.createElement(NotificationViewport, {
      notifications: [],
      onDismiss: () => {},
    })
  );
  assert.equal(emptyHtml, '');

  const populatedHtml = ReactDOMServer.renderToString(
    React.createElement(NotificationViewport, {
      notifications: [
        {
          id: 'n3',
          message: 'Personalization updated.',
          severity: 'info',
          createdAt: Date.now(),
        },
      ],
      onDismiss: () => {},
    })
  );
  assert.match(populatedHtml, /role="region"/);
  assert.match(populatedHtml, /aria-label="Notifications"/);
  assert.match(populatedHtml, /Personalization updated\./);
});

test('RetryableError: renders error message, alert role, and accessible retry action', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(RetryableError, {
      error: 'Cannot reach OVAEL backend on port 8000',
      title: 'Connection Lost',
      onRetry: () => {},
      retryLabel: 'Reconnect',
    })
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /Connection Lost/);
  assert.match(html, /Unable to reach the OVAEL server/);
  assert.match(html, /Reconnect/);
});

test('SkeletonGroup: renders accessible aria-hidden placeholders for text, card, row, and table', () => {
  const textHtml = ReactDOMServer.renderToString(React.createElement(SkeletonText, { lines: 4 }));
  assert.match(textHtml, /aria-hidden="true"/);
  assert.match(textHtml, /skeleton-text-group/);

  const cardHtml = ReactDOMServer.renderToString(React.createElement(SkeletonCard, { hasAvatar: true }));
  assert.match(cardHtml, /aria-hidden="true"/);
  assert.match(cardHtml, /skeleton-card-group/);
  assert.match(cardHtml, /ui-skeleton--circular/);

  const rowHtml = ReactDOMServer.renderToString(React.createElement(SkeletonRow));
  assert.match(rowHtml, /aria-hidden="true"/);
  assert.match(rowHtml, /skeleton-row-group/);

  const tableHtml = ReactDOMServer.renderToString(React.createElement(SkeletonTable, { rows: 3 }));
  assert.match(tableHtml, /aria-hidden="true"/);
  assert.match(tableHtml, /skeleton-table-group/);
});

test('EmptyState: supports default, compact, and card variants with semantic action', () => {
  const defaultHtml = ReactDOMServer.renderToString(
    React.createElement(EmptyState, {
      title: 'No Courses Yet',
      description: 'Create your first course to begin adaptive tutoring.',
      action: React.createElement('button', null, 'Create Course'),
    })
  );
  assert.match(defaultHtml, /ui-empty-state/);
  assert.match(defaultHtml, /No Courses Yet/);
  assert.match(defaultHtml, /Create Course/);

  const compactHtml = ReactDOMServer.renderToString(
    React.createElement(EmptyState, {
      variant: 'compact',
      title: 'No Topics Found',
      description: 'Add a topic to start sessions.',
    })
  );
  assert.match(compactHtml, /ui-empty-state--compact/);
  assert.match(compactHtml, /No Topics Found/);

  const cardHtml = ReactDOMServer.renderToString(
    React.createElement(EmptyState, {
      variant: 'card',
      title: 'No Uploaded Materials',
    })
  );
  assert.match(cardHtml, /ui-empty-state--card/);
});
