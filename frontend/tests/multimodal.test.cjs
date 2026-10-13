/* Multimodal learning interface contract tests using Node test runner. */
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
  DrawingPadModal,
  ImageUploadZone,
  TranscriptionReview,
  SpeechInputButton,
} = require('../src/components/multimodal/index.ts');

test('DrawingPadModal renders accessible dialog, canvas, tools, and actions', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(DrawingPadModal, {
      onDone: () => {},
      onCancel: () => {},
    })
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Handwriting &amp; Diagram Canvas/);
  assert.match(html, /drawing-canvas/);
  assert.match(html, /Use drawing &amp; extract text/);
});

test('DrawingPadModal contains pen, eraser, line-width pills, and undo/clear controls', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(DrawingPadModal, {
      onDone: () => {},
      onCancel: () => {},
    })
  );

  assert.match(html, /Pen/);
  assert.match(html, /Eraser/);
  assert.match(html, /Fine/);
  assert.match(html, /Medium/);
  assert.match(html, /Broad/);
  assert.match(html, /Undo/);
  assert.match(html, /Clear/);
});

test('ImageUploadZone renders dropzone with format guidance and size hint', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ImageUploadZone, {
      onFileSelected: () => {},
      maxBytes: 12 * 1024 * 1024,
    })
  );

  assert.match(html, /Click to upload/);
  assert.match(html, /drag and drop an image/);
  assert.match(html, /12MB/);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="image\/\*"/);
});

test('ImageUploadZone displays preview thumbnail and metadata when activeFile is set', () => {
  // Mock File-like object
  const mockFile = {
    name: 'handwritten_reaction.png',
    size: 204800,
    type: 'image/png',
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ImageUploadZone, {
      onFileSelected: () => {},
      activeFile: mockFile,
      onRemoveFile: () => {},
    })
  );

  assert.match(html, /handwritten_reaction\.png/);
  assert.match(html, /200\.0 KB/);
  assert.match(html, /Replace/);
  assert.match(html, /Remove/);
});

test('ImageUploadZone renders processing spinner when busy is true', () => {
  const mockFile = {
    name: 'diagram.png',
    size: 102400,
    type: 'image/png',
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ImageUploadZone, {
      onFileSelected: () => {},
      activeFile: mockFile,
      busy: true,
    })
  );

  assert.match(html, /Processing OCR\.\.\./);
});

test('TranscriptionReview renders source tag, confidence percentage, and warning notice', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TranscriptionReview, {
      ocr: {
        text: 'ATP Synthase Complex V',
        extraction_confidence: 0.88,
        engine: 'tesseract',
        source: 'drawing',
      },
      ocrConfirmed: true,
      onOcrChange: () => {},
      onOcrConfirmChange: () => {},
    })
  );

  assert.match(html, /Handwriting Transcription/);
  assert.match(html, /Drawing/);
  assert.match(html, /tesseract/);
  assert.match(html, /88% confidence/);
  assert.match(html, /ATP Synthase Complex V/);
  assert.match(html, /checked=""/);
});

test('TranscriptionReview renders low confidence warning when extraction_confidence is below 0.65', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TranscriptionReview, {
      ocr: {
        text: 'Formula: H2O + CO2',
        extraction_confidence: 0.45,
        engine: 'vision',
        source: 'image',
      },
      ocrConfirmed: false,
      onOcrChange: () => {},
      onOcrConfirmChange: () => {},
    })
  );

  assert.match(html, /Low OCR confidence \(45%\)/);
  assert.match(html, /Image/);
  assert.match(html, /vision/);
  assert.match(html, /Check the box above to approve this transcription/);
});

test('SpeechInputButton renders accessible microphone trigger and active listening indicator', () => {
  const idleHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SpeechInputButton, {
      isListening: false,
      onToggleListening: () => {},
    })
  );

  assert.match(idleHtml, /aria-pressed="false"/);
  assert.match(idleHtml, /Speak answer/);

  const listeningHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SpeechInputButton, {
      isListening: true,
      onToggleListening: () => {},
    })
  );

  assert.match(listeningHtml, /speech-btn--listening/);
  assert.match(listeningHtml, /speech-pulse-indicator/);
  assert.match(listeningHtml, /aria-pressed="true"/);
  assert.match(listeningHtml, /Listening\.\.\. Click to stop/);
});
