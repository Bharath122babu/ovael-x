/* Settings, Account Management and Privacy UI tests using Node test runner. */
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
  AccountProfileCard,
  PersonalizationToggle,
  ActiveSessionsList,
  PrivacyNoticeCard,
  ChangePasswordModal,
  RotateRecoveryKeyModal,
  ClearMemoryModal,
  DeleteAccountModal,
  SettingsView,
} = require('../src/components/settings/index.ts');

const sampleProfile = {
  user_id: 'usr_88291a9b',
  username: 'kush_learner',
  role: 'student',
  display_name: 'Kush Learner',
  institution: 'Department of Neuroscience',
  preferences: { focus_mode: true },
  synthetic: false,
  updated_at: '2026-10-12T12:00:00Z',
};

const sampleSessions = [
  {
    session_id: 'sess_1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    ip_address: '127.0.0.1',
    created_at: '2026-10-12T10:00:00Z',
    expires_at: '2026-10-19T10:00:00Z',
    is_current: true,
  },
  {
    session_id: 'sess_2',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    ip_address: '192.168.1.45',
    created_at: '2026-10-10T14:22:00Z',
    expires_at: '2026-10-17T14:22:00Z',
    is_current: false,
  },
];

test('AccountProfileCard: renders username, user ID, role badge, and action triggers', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(AccountProfileCard, {
      profile: sampleProfile,
      onChangePassword: () => {},
      onRotateRecoveryKey: () => {},
    })
  );
  assert.match(html, /kush_learner/);
  assert.match(html, /usr_88291a9b/);
  assert.match(html, /Learner/);
  assert.match(html, /Department of Neuroscience/);
  assert.match(html, /Change Password/);
  assert.match(html, /Rotate Recovery Key/);
  assert.match(html, /Same-origin encrypted cookie session/);
});

test('AccountProfileCard: returns empty when profile is null', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(AccountProfileCard, {
      profile: null,
      onChangePassword: () => {},
      onRotateRecoveryKey: () => {},
    })
  );
  assert.equal(html, '');
});

test('PersonalizationToggle: renders accessible switch with state and architectural explanation', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(PersonalizationToggle, {
      enabled: true,
      loading: false,
      onToggle: async () => {},
    })
  );
  assert.match(html, /Adaptive Memory &amp; Personalization/);
  assert.match(html, /role="switch"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /Active/);
  assert.match(html, /pedagogical engine retrieves procedural memory/);
});

test('ActiveSessionsList: renders active sessions, current session indicator, and revoke actions', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ActiveSessionsList, {
      sessions: sampleSessions,
      loading: false,
      onRevokeSession: async () => {},
      onRevokeAllOther: async () => {},
    })
  );
  assert.match(html, /Active Login Sessions/);
  assert.match(html, /Current Session/);
  assert.match(html, /127\.0\.0\.1/);
  assert.match(html, /192\.168\.1\.45/);
  assert.match(html, /Revoke/);
  assert.match(html, /Log Out Other Sessions.*1/);
});

test('ActiveSessionsList: does not display logout other sessions button when only current session exists', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ActiveSessionsList, {
      sessions: [sampleSessions[0]],
      loading: false,
      onRevokeSession: async () => {},
      onRevokeAllOther: async () => {},
    })
  );
  assert.match(html, /Current Session/);
  assert.doesNotMatch(html, /Log Out Other Sessions/);
});

test('PrivacyNoticeCard: renders privacy guarantees and bounded AI architectural disclosure', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(PrivacyNoticeCard)
  );
  assert.match(html, /Privacy, Security &amp; Data Boundaries/);
  assert.match(html, /Credential &amp; Session Isolation/);
  assert.match(html, /Multimodal Ephemeral Processing/);
  assert.match(html, /Speech Recognition Disclaimers/);
  assert.match(html, /Bounded AI Boundaries/);
});

test('ChangePasswordModal: renders form inputs when open', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ChangePasswordModal, {
      isOpen: true,
      onClose: () => {},
      onSuccess: () => {},
    })
  );
  assert.match(html, /Change Password/);
  assert.match(html, /Current Password/);
  assert.match(html, /New Password/);
  assert.match(html, /Confirm New Password/);
  assert.match(html, /Update Password/);
});

test('RotateRecoveryKeyModal: renders generation prompt when open', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(RotateRecoveryKeyModal, {
      isOpen: true,
      onClose: () => {},
    })
  );
  assert.match(html, /Rotate Recovery Key/);
  assert.match(html, /Account Password/);
  assert.match(html, /Generate New Key/);
});

test('ClearMemoryModal: renders destructive memory warning', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ClearMemoryModal, {
      isOpen: true,
      onClose: () => {},
      onSuccess: () => {},
    })
  );
  assert.match(html, /Clear Adaptive Memory/);
  assert.match(html, /historical learning-memory graph/);
  assert.match(html, /Clear Memory/);
});

test('DeleteAccountModal: renders account deletion dialog and confirmation password field', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DeleteAccountModal, {
      isOpen: true,
      onClose: () => {},
      onSuccess: () => {},
    })
  );
  assert.match(html, /Delete Account/);
  assert.match(html, /completely permanent and cannot be reversed/);
  assert.match(html, /Confirm Your Password/);
  assert.match(html, /Permanently Delete Account/);
});

test('SettingsView: orchestrates profile, memory toggle, sessions, privacy, danger zone, and about OVAEL', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(SettingsView, {
      user: {
        user_id: 'usr_88291a9b',
        username: 'kush_learner',
        role: 'student',
      },
      onLogout: () => {},
      initialProfile: sampleProfile,
      initialSessions: sampleSessions,
    })
  );
  assert.match(html, /Settings &amp; Account/);
  assert.match(html, /Manage your profile identity/);
  assert.match(html, /Account Identity/);
  assert.match(html, /kush_learner/);
  assert.match(html, /Adaptive Memory &amp; Personalization/);
  assert.match(html, /Active Login Sessions/);
  assert.match(html, /Privacy, Security &amp; Data Boundaries/);
  assert.match(html, /Danger Zone/);
  assert.match(html, /About OVAEL-X/);
});
