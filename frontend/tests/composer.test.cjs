/* Answer composer and question-specific assessment controls contract tests. */
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
  SubmissionStatus,
  TextAnswerInput,
  MultipleChoiceInput,
  TrueFalseInput,
  NumericAnswerInput,
  CodeAnswerInput,
  AnswerComposer,
} = require('../src/components/composer/index.ts');

test('SubmissionStatus renders loading state with spinner and busy text', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SubmissionStatus, {
      busy: true,
      busyText: 'Evaluating learner answer...',
    })
  );

  assert.match(html, /role="status"/);
  assert.match(html, /Evaluating learner answer\.\.\./);
  assert.match(html, /spin/);
});

test('SubmissionStatus renders error alert with role="alert"', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SubmissionStatus, {
      error: 'Enter a valid finite numeric answer.',
    })
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /Enter a valid finite numeric answer\./);
  assert.match(html, /Submission error/);
});

test('TextAnswerInput renders accessible textarea with label and shortcut hint', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TextAnswerInput, {
      value: 'My formulated explanation',
      onChange: () => {},
      label: 'Scientific Reasoning',
      placeholder: 'Explain the mechanism...',
    })
  );

  assert.match(html, /Scientific Reasoning/);
  assert.match(html, /My formulated explanation/);
  assert.match(html, /Ctrl/);
  assert.match(html, /Enter/);
  assert.match(html, /25 characters/);
});

test('MultipleChoiceInput renders radiogroup and options with letter indicators', () => {
  const options = ['Glycolysis', 'Krebs Cycle', 'Oxidative Phosphorylation'];
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MultipleChoiceInput, {
      options,
      selectedChoice: 1,
      onSelectChoice: () => {},
    })
  );

  assert.match(html, /role="radiogroup"/);
  assert.match(html, /role="radio"/);
  assert.match(html, />A<\/span>/);
  assert.match(html, />B<\/span>/);
  assert.match(html, />C<\/span>/);
  assert.match(html, /Krebs Cycle/);
  assert.match(html, /mcq-option--selected/);
  assert.match(html, /aria-checked="true"/);
});

test('MultipleChoiceInput renders friendly empty state when no options are provided', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MultipleChoiceInput, {
      options: [],
      selectedChoice: null,
      onSelectChoice: () => {},
    })
  );

  assert.match(html, /No selectable options provided/);
});

test('TrueFalseInput renders accessible True/False radiogroup with selection state', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TrueFalseInput, {
      value: 'true',
      onChange: () => {},
    })
  );

  assert.match(html, /role="radiogroup"/);
  assert.match(html, /True/);
  assert.match(html, /False/);
  assert.match(html, /true-false-option--selected/);
  assert.match(html, /aria-checked="true"/);
});

test('NumericAnswerInput renders numeric field with unit and validation helper', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(NumericAnswerInput, {
      value: '3.1415',
      onChange: () => {},
      unit: 'radians',
      label: 'Calculated Angle',
    })
  );

  assert.match(html, /Calculated Angle/);
  assert.match(html, /value="3.1415"/);
  assert.match(html, /inputmode="decimal"/i);
  assert.match(html, /radians/);
  assert.match(html, /finite decimals/);
});

test('CodeAnswerInput renders monospace editor with language badge and line count', () => {
  const codeSnippet = 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)';
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CodeAnswerInput, {
      value: codeSnippet,
      onChange: () => {},
      language: 'Python',
      label: 'Recursive Solution',
    })
  );

  assert.match(html, /Recursive Solution/);
  assert.match(html, /Python/);
  assert.match(html, /4 lines/);
  assert.match(html, /def fibonacci/);
  assert.match(html, /answer-composer__code-area/);
});

test('AnswerComposer dynamically selects control matching move.answer_type', () => {
  // 1. MCQ mode
  const mcqHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AnswerComposer, {
      move: { answer_type: 'mcq', options: ['Alpha', 'Beta'] },
      answer: '',
      onAnswerChange: () => {},
      choice: 0,
      onSelectChoice: () => {},
      mode: 'text',
      onToggleMode: () => {},
      busy: false,
      onSubmit: () => {},
    })
  );
  assert.match(mcqHtml, /mcq-option/);
  assert.match(mcqHtml, /Alpha/);

  // 2. Boolean mode
  const boolHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AnswerComposer, {
      move: { answer_type: 'boolean' },
      answer: 'false',
      onAnswerChange: () => {},
      choice: null,
      onSelectChoice: () => {},
      mode: 'text',
      onToggleMode: () => {},
      busy: false,
      onSubmit: () => {},
    })
  );
  assert.match(boolHtml, /true-false-option/);

  // 3. Numeric mode
  const numHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AnswerComposer, {
      move: { answer_type: 'numeric' },
      answer: '42',
      onAnswerChange: () => {},
      choice: null,
      onSelectChoice: () => {},
      mode: 'text',
      onToggleMode: () => {},
      busy: false,
      onSubmit: () => {},
    })
  );
  assert.match(numHtml, /answer-composer__numeric-input/);
});

test('AnswerComposer renders OCR review box with confirmation checkbox and confidence warning', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AnswerComposer, {
      move: { answer_type: 'free_text' },
      answer: '',
      onAnswerChange: () => {},
      choice: null,
      onSelectChoice: () => {},
      mode: 'text',
      onToggleMode: () => {},
      busy: false,
      onSubmit: () => {},
      ocr: {
        text: 'Mitochondrial matrix',
        extraction_confidence: 0.52,
        source: 'drawing',
      },
      ocrConfirmed: false,
      onOcrConfirmChange: () => {},
    })
  );

  assert.match(html, /ocr-review/);
  assert.match(html, /Mitochondrial matrix/);
  assert.match(html, /I checked this transcription against my image/);
  assert.match(html, /Low OCR confidence/);
});
