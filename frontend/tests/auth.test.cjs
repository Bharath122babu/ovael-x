/* Authentication UI tests using Node test runner without browser overhead. */
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
  AuthBranding,
  SignInForm,
  RegisterForm,
  RecoverForm,
  AuthPage,
} = require('../src/components/auth/index.ts');

test('AuthBranding renders brand statements, architecture pillars, and stats', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AuthBranding)
  );

  assert.match(html, /ADAPTIVE LEARNING ENGINE/);
  assert.match(html, /Intelligence that knows when.*not.*to use AI/i);
  assert.match(html, /Deterministic kernel/);
  assert.match(html, /Demonstrated mastery/);
  assert.match(html, /Local-first security/);
  assert.match(html, /01/);
  assert.match(html, /07/);
  assert.match(html, /auth-branding__svg-mesh/);
});

test('SignInForm renders username, password, password toggle, and submit button', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SignInForm, {
      onSubmit: async () => {},
      onSwitchToRegister: () => {},
      onSwitchToRecover: () => {},
      busy: false,
    })
  );

  assert.match(html, /Sign in to OVAEL/);
  assert.match(html, /Learner ID \/ Username/);
  assert.match(html, /id="signin-username"/);
  assert.match(html, /id="signin-password"/);
  assert.match(html, /type="password"/);
  assert.match(html, /aria-label="Show password"/);
  assert.match(html, /Forgot password\?/);
  assert.match(html, /Sign in to workspace/);
  assert.match(html, /Create an account/);
});

test('SignInForm in busy state sets disabled and loading text on submit button', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SignInForm, {
      onSubmit: async () => {},
      onSwitchToRegister: () => {},
      onSwitchToRecover: () => {},
      busy: true,
    })
  );

  assert.match(html, /Authenticating\.\.\./);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /disabled/);
});

test('RegisterForm renders username, password, confirm password, and role selector', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(RegisterForm, {
      onSubmit: async () => {},
      onSwitchToSignIn: () => {},
      busy: false,
    })
  );

  assert.match(html, /Create your account/);
  assert.match(html, /Learner ID \/ Username/);
  assert.match(html, /At least 10 characters/);
  assert.match(html, /id="register-password"/);
  assert.match(html, /id="register-confirm-password"/);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /Learner/);
  assert.match(html, /Teacher/);
  assert.match(html, /Create workspace account/);
});

test('RecoverForm renders username, recovery key input, and reset button', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(RecoverForm, {
      onSubmit: async () => {},
      onSwitchToSignIn: () => {},
      busy: false,
    })
  );

  assert.match(html, /Reset your password/);
  assert.match(html, /Recovery Key/);
  assert.match(html, /id="recover-key"/);
  assert.match(html, /id="recover-new-password"/);
  assert.match(html, /id="recover-confirm-password"/);
  assert.match(html, /Reset password &amp; continue|Reset password & continue/);
});

test('AuthPage renders skip link, branding, default sign-in form, and trust footer', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AuthPage, {
      onLogin: async () => {},
      onRegister: async () => {},
      onRecover: async () => {},
      error: '',
      onClearError: () => {},
      busy: false,
    })
  );

  assert.match(html, /href="#auth-main-card"/);
  assert.match(html, /Skip to authentication form/);
  assert.match(html, /auth-branding/);
  assert.match(html, /Sign in to OVAEL/);
  assert.match(html, /Local-first learning/);
  assert.match(html, /Argon2id encryption/);
});

test('AuthPage displays error alert when error is provided', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AuthPage, {
      onLogin: async () => {},
      onRegister: async () => {},
      onRecover: async () => {},
      error: 'Invalid learner credentials. Please check your username and password.',
      onClearError: () => {},
      busy: false,
    })
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /Invalid learner credentials/);
});
