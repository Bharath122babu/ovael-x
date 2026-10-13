/* Active tutoring workspace contract tests using Node test runner. */
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
  SafeMarkdown,
  SessionHeader,
  TutorTurn,
  LearnerTurn,
  EvidenceBanner,
  DecisionTraceViewer,
  SessionContextPanel,
  ActiveSessionWorkspace,
} = require('../src/components/session/index.ts');

test('SafeMarkdown renders headings, paragraphs, lists, code blocks, and math safely', () => {
  const mdText = `# Core Mechanism\n\nATP synthase produces ATP from ADP and Pi.\n\nKey steps:\n- Proton gradient across inner membrane\n- Rotor rotation\n\n\`\`\`python\ndef calculate_atp(protons):\n    return protons / 4\n\`\`\`\n\nFormula: $E = mc^2$ and inline \`code_val\`.`;
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SafeMarkdown, { content: mdText })
  );

  assert.match(html, /Core Mechanism/);
  assert.match(html, /tutor-heading--1/);
  assert.match(html, /Proton gradient across inner membrane/);
  assert.match(html, /tutor-list/);
  assert.match(html, /tutor-code-block/);
  assert.match(html, /def calculate_atp/);
  assert.match(html, /tutor-inline-math/);
  assert.match(html, /E = mc\^2/);
  assert.match(html, /tutor-inline-code/);
  assert.match(html, /code_val/);
});

test('SessionHeader renders breadcrumbs, mode badge, active status, and exit action', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SessionHeader, {
      courseName: 'Cell Biology',
      conceptName: 'Mitochondrial Respiration',
      mode: 'study',
      isActive: true,
      onLeaveSession: () => {},
    })
  );

  assert.match(html, /Cell Biology/);
  assert.match(html, /Mitochondrial Respiration/);
  assert.match(html, /Guided Study/);
  assert.match(html, /Session active/);
  assert.match(html, /Exit session/);
});

test('TutorTurn renders tutor metadata, formatted text, and MCQ options with selection', () => {
  const moveData = {
    action: 'socratic_question',
    answer_type: 'mcq',
    options: ['Matrix', 'Inner membrane', 'Intermembrane space'],
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TutorTurn, {
      text: 'Where does oxidative phosphorylation take place?',
      move: moveData,
      choice: 1,
      onSelectChoice: () => {},
    })
  );

  assert.match(html, /OVAEL Tutor/);
  assert.match(html, /Socratic Question/);
  assert.match(html, /Where does oxidative phosphorylation take place\?/);
  assert.match(html, /Inner membrane/);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /tutor-mcq__option--selected/);
});

test('TutorTurn renders status notices for unvalidated questions and required modalities', () => {
  const moveData = {
    action: 'explain',
    validation_state: 'generated_unvalidated',
    required_modalities: ['text', 'diagram'],
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TutorTurn, {
      text: 'Consider the following biochemical cycle.',
      move: moveData,
    })
  );

  assert.match(html, /Unvalidated question: no mastery credit until verified/);
  assert.match(html, /Required answer parts:/);
  assert.match(html, /text, diagram/);
});

test('LearnerTurn displays user contribution, initial avatar, and intent tag', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LearnerTurn, {
      username: 'kushl',
      text: 'Could you explain why the proton pump requires NADH?',
      intent: 'need_explanation',
    })
  );

  assert.match(html, /You/);
  assert.match(html, /K/); // initial
  assert.match(html, /Requested Explanation/);
  assert.match(html, /Could you explain why the proton pump requires NADH\?/);
});

test('EvidenceBanner renders evaluated score and verification status', () => {
  const gradedEvidence = {
    score: 0.85,
    evaluation: { status: 'graded' },
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(EvidenceBanner, { evidence: gradedEvidence })
  );

  assert.match(html, /Evaluated • 85% Mastery Signal/);
  assert.match(html, /evidence-banner--success/);
  assert.match(html, /Verified grading updated your demonstrable learning state/);
});

test('EvidenceBanner renders needs review reason when correctness cannot be established', () => {
  const unverifiedEvidence = {
    score: null,
    evaluation: {
      status: 'needs_review',
      needs_review_reason: 'Ambiguous chemical mechanism requires teacher verification.',
    },
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(EvidenceBanner, { evidence: unverifiedEvidence })
  );

  assert.match(html, /Needs Manual Verification/);
  assert.match(html, /evidence-banner--warning/);
  assert.match(html, /Ambiguous chemical mechanism requires teacher verification/);
});

test('SessionContextPanel displays target, policy guarantees, and response type', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SessionContextPanel, {
      courseName: 'Cell Biology',
      conceptName: 'Citric Acid Cycle',
      mode: 'study',
      goal: 'Understand acetyl-CoA entry',
      move: { answer_type: 'code' },
      evidence: { score: 0.9, evaluation: { status: 'graded' } },
    })
  );

  assert.match(html, /Learning Context/);
  assert.match(html, /Citric Acid Cycle/);
  assert.match(html, /Cell Biology/);
  assert.match(html, /Target Goal:/);
  assert.match(html, /Understand acetyl-CoA entry/);
  assert.match(html, /Demonstrated Mastery/);
  assert.match(html, /graded \(90%\)/);
});

test('ActiveSessionWorkspace orchestrates header, timeline, typing indicator, and composer slot', () => {
  const sampleMessages = [
    { who: 'system', text: 'Welcome to your learning session on Photosystem II.' },
    { who: 'user', text: 'Photolysis splits water into oxygen and protons.' },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ActiveSessionWorkspace, {
      courseName: 'Plant Physiology',
      conceptName: 'Photosystem II',
      mode: 'study',
      messages: sampleMessages,
      busy: true,
      user: { username: 'alex' },
      onLeaveSession: () => {},
      composerSlot: React.createElement('div', { id: 'test-composer' }, 'Composer Active'),
    })
  );

  assert.match(html, /ACTIVE LEARNING SESSION/);
  assert.match(html, /Plant Physiology/);
  assert.match(html, /Photosystem II/);
  assert.match(html, /Welcome to your learning session on Photosystem II/);
  assert.match(html, /Photolysis splits water into oxygen and protons/);
  assert.match(html, /Evaluating answer &amp; planning next step\.\.\.|Evaluating answer & planning next step\.\.\./);
  assert.match(html, /id="test-composer"/);
  assert.match(html, /Composer Active/);
});
