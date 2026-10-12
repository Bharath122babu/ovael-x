/* Learning Evidence and Proof of Learning tests using Node test runner. */
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
  ProofDimensionBar,
  EvidenceMetricCard,
  ConceptEvidenceRow,
  ConceptEvidenceTable,
  DecisionAuditDrawer,
  LearningEvidenceView,
} = require('../src/components/evidence/index.ts');

const sampleConceptStates = [
  {
    subject_id: 'sub-bio',
    concept_id: 'c-mitosis',
    concept_name: 'Mitosis & Cell Division',
    acquisition: 0.88,
    independent: 0.75,
    transfer: 0.72,
    retention: 0.65,
    evidence_quality: 0.82,
    uncertainty: 0.18,
    assistance_gap: 0.13,
    assisted_performance: 0.88,
    evidence_mass: {
      acquisition: 4.5,
      independent: 3.2,
      transfer: 1.8,
      retention: 1.2,
      assisted: 1.3,
    },
    last_evidence_at: '2026-10-11T14:30:00Z',
    next_retention_check_at: '2026-10-15T14:30:00Z',
    retention_due: false,
    retention_interval_days: 6,
    status: 'independent_verified',
    recommended_verification: 'retention',
  },
  {
    subject_id: 'sub-bio',
    concept_id: 'c-meiosis',
    concept_name: 'Meiosis & Genetic Recombination',
    acquisition: 0.65,
    independent: 0.45,
    transfer: 0.0,
    retention: 0.0,
    evidence_quality: 0.40,
    uncertainty: 0.60,
    assistance_gap: 0.20,
    assisted_performance: 0.65,
    evidence_mass: {
      acquisition: 2.1,
      independent: 0.8,
      transfer: 0.0,
      retention: 0.0,
      assisted: 1.3,
    },
    last_evidence_at: '2026-10-10T10:15:00Z',
    next_retention_check_at: null,
    retention_due: false,
    retention_interval_days: 3,
    status: 'needs_independent_practice',
    recommended_verification: 'independent',
  },
  {
    subject_id: 'sub-bio',
    concept_id: 'c-glycolysis',
    concept_name: 'Glycolysis & ATP Production',
    acquisition: 0.90,
    independent: 0.85,
    transfer: 0.80,
    retention: 0.75,
    evidence_quality: 0.90,
    uncertainty: 0.10,
    assistance_gap: 0.05,
    assisted_performance: 0.90,
    evidence_mass: {
      acquisition: 5.0,
      independent: 4.0,
      transfer: 2.5,
      retention: 2.0,
      assisted: 1.0,
    },
    last_evidence_at: '2026-10-05T09:00:00Z',
    next_retention_check_at: '2026-10-12T09:00:00Z',
    retention_due: true,
    retention_interval_days: 7,
    status: 'retained',
    recommended_verification: 'retention',
  },
];

const sampleSnapshot = {
  subject_id: 'sub-bio',
  generated_at: '2026-10-12T15:00:00Z',
  principle: 'Assisted performance is evidence of acquisition, not automatic proof of independent retained transferable competence.',
  states: sampleConceptStates,
  summary: {
    concepts: 3,
    mean_assistance_gap: 0.126,
    retention_checks_due: 1,
    independently_verified: 2,
    transfer_verified: 1,
    retained: 1,
  },
  scope: 'persistent',
};

test('ProofDimensionBar: renders percentage score and accumulated mass when evidence exists', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ProofDimensionBar, {
      label: 'Independent Use',
      score: 0.75,
      mass: 3.2,
      dimension: 'independent',
    })
  );
  assert.match(html, /Independent Use/);
  assert.match(html, /75%/);
  assert.match(html, /3\.2.*mass/);
  assert.match(html, /proof-dimension-bar--independent/);
});

test('ProofDimensionBar: renders Unobserved when observation mass is 0', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ProofDimensionBar, {
      label: 'Delayed Retention',
      score: 0.0,
      mass: 0.0,
      dimension: 'retention',
    })
  );
  assert.match(html, /Delayed Retention/);
  assert.match(html, /Unobserved/);
});

test('EvidenceMetricCard: renders metric value, label, and description', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(EvidenceMetricCard, {
      icon: React.createElement('span', null, 'Icon'),
      label: 'Independently Verified',
      value: 8,
      description: 'Passed unassisted checks without hints',
      variant: 'highlight',
    })
  );
  assert.match(html, /Independently Verified/);
  assert.match(html, />8</);
  assert.match(html, /Passed unassisted checks without hints/);
  assert.match(html, /evidence-metric-card--highlight/);
});

test('ConceptEvidenceRow: renders concept identity, status badge, and scaffold gap', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ConceptEvidenceRow, {
      state: sampleConceptStates[0],
    })
  );
  assert.match(html, /Mitosis &amp; Cell Division/);
  assert.match(html, /Independently Verified/);
  assert.match(html, /Scaffold Gap/);
  assert.match(html, /\+13%/);
  assert.match(html, /82% data sufficiency/);
});

test('ConceptEvidenceRow: displays Retention Due alert badge when check is overdue', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ConceptEvidenceRow, {
      state: sampleConceptStates[2],
    })
  );
  assert.match(html, /Glycolysis &amp; ATP Production/);
  assert.match(html, /Retention Due/);
  assert.match(html, /Retained/);
});

test('ConceptEvidenceTable: renders toolbar, search input, status filter pills, and rows', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ConceptEvidenceTable, {
      states: sampleConceptStates,
    })
  );
  assert.match(html, /Search topics by name, ID, or subject\.\.\./);
  assert.match(html, /All \(/);
  assert.match(html, /Verified \(/);
  assert.match(html, /Needs Practice \(/);
  assert.match(html, /Retention Due \(/);
  assert.match(html, /Mitosis &amp; Cell Division/);
  assert.match(html, /Meiosis &amp; Genetic Recombination/);
});

test('ConceptEvidenceTable: renders clean empty state when no states provided', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ConceptEvidenceTable, {
      states: [],
    })
  );
  assert.match(html, /No recorded evidence yet/);
  assert.match(html, /Complete learning sessions and answer assessment questions/);
});

test('DecisionAuditDrawer: renders deterministic DecisionKernel architecture and evaluation guarantees', () => {
  const sampleAudit = {
    status: 'ready',
    session: {
      teaching_session_id: 'ts-101',
      subject_id: 'sub-bio',
      concept_id: 'c-mitosis',
      goal: 'Understand anaphase',
      mode: 'study',
      updated_at: '2026-10-12T14:00:00Z',
    },
    observed: {
      evidence: {
        correct: true,
        score: 0.95,
        evaluation: {
          status: 'graded',
        },
      },
    },
    decision: {
      decision_frame: {
        action: 'practice',
        reason: 'Reinforce independent mastery before spaced retention.',
        assistance_level: 0,
      },
    },
    diagnosis: {
      summary: 'All cellular spindle checkpoints correctly articulated.',
    },
    architecture: {
      controller: 'DecisionKernel',
      control_path: 'deterministic state -> one DecisionFrame',
      ai_boundary: 'Semantic escalation only; no autonomous authority',
    },
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(DecisionAuditDrawer, {
      isOpen: true,
      auditData: sampleAudit,
      loading: false,
      onClose: () => {},
    })
  );
  assert.match(html, /Learning-Engine Decision Audit/);
  assert.match(html, /DecisionKernel/);
  assert.match(html, /deterministic state -&gt; one DecisionFrame/);
  assert.match(html, /Demonstrated Correct/);
  assert.match(html, /95.*%/);
  assert.match(html, /All cellular spindle checkpoints correctly articulated\./);
  assert.match(html, /Level.*0.*\(Sovereignty Scale 0–6\)/);
});

test('LearningEvidenceView: orchestrates page header, principle banner, overview KPI cards, and table', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(LearningEvidenceView, {
      snapshot: sampleSnapshot,
      loading: false,
      error: null,
      onRefresh: async () => {},
    })
  );
  assert.match(html, /Learning Evidence/);
  assert.match(html, /Verifiable Competence vs\. Assisted Hints/);
  assert.match(html, /Assisted performance is evidence of acquisition/);
  assert.match(html, /Topics Evaluated/);
  assert.match(html, /Independently Verified/);
  assert.match(html, /Mean Scaffold Gap/);
  assert.match(html, /\+13%/);
  assert.match(html, /1 spaced retention check is due!/);
  assert.match(html, /Mitosis &amp; Cell Division/);
});
