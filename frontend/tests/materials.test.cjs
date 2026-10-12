/* Course Materials and Document Processing UX tests using Node test runner. */
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
  DocumentStatusBadge,
  DocumentUploadZone,
  DocumentItemRow,
  DocumentPreviewModal,
  DeleteDocumentModal,
  CourseMaterialLibrary,
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
  formatBytes,
} = require('../src/components/materials/index.ts');

const { CourseDetailView } = require('../src/components/courses/CourseDetailView.tsx');

const sampleDocuments = [
  {
    document_id: 'doc-001',
    original_filename: 'Campbell_Biology_Ch12_CellCycle.pdf',
    content_type: 'application/pdf',
    status: 'ready',
    byte_size: 15485760, // ~14.7 MB
    sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    created_at: '2026-10-10T14:30:00Z',
    updated_at: '2026-10-10T14:32:00Z',
    course_id: 'c101',
    ready_page_count: 36,
    total_page_count: 36,
  },
  {
    document_id: 'doc-002',
    original_filename: 'Lecture_04_Mitosis_Handout.docx',
    content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    status: 'processing',
    byte_size: 2048500, // ~2.0 MB
    sha256: 'b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef0',
    created_at: '2026-10-11T09:15:00Z',
    updated_at: '2026-10-11T09:15:30Z',
    course_id: 'c101',
    ready_page_count: 2,
    total_page_count: 10,
  },
  {
    document_id: 'doc-003',
    original_filename: 'Corrupted_Scan_Notes.pdf',
    content_type: 'application/pdf',
    status: 'failed_retryable',
    byte_size: 4096000,
    sha256: 'c3d4e5f6a1b27890123456789abcdef0123456789abcdef0123456789abcdef0',
    created_at: '2026-10-11T11:00:00Z',
    updated_at: '2026-10-11T11:01:00Z',
    course_id: 'c101',
    failure_reason: 'Corrupted font encoding on page 3. PDF renderer returned error 12.',
    ready_page_count: 0,
    total_page_count: 5,
  },
  {
    document_id: 'doc-004',
    original_filename: 'Encrypted_Syllabus.pdf',
    content_type: 'application/pdf',
    status: 'password_required',
    byte_size: 1024000,
    sha256: 'd4e5f6a1b2c37890123456789abcdef0123456789abcdef0123456789abcdef0',
    created_at: '2026-10-11T12:00:00Z',
    updated_at: '2026-10-11T12:00:10Z',
    course_id: 'c101',
    ready_page_count: 0,
    total_page_count: null,
  },
];

test('Constants: ALLOWED_EXTENSIONS matches backend _ALLOWED_EXTENSIONS exactly', () => {
  assert.equal(ALLOWED_EXTENSIONS.includes('.pdf'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.docx'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.pptx'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.txt'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.md'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.epub'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.png'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.jpg'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.jpeg'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.webp'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.wav'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.mp3'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.m4a'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.mp4'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.webm'), true);
  assert.equal(ALLOWED_EXTENSIONS.includes('.mov'), true);
  assert.equal(ALLOWED_EXTENSIONS.length, 16);
  assert.equal(MAX_FILE_BYTES, 100 * 1024 * 1024);
});

test('Utility: formatBytes handles various sizes accurately', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(15485760), '14.8 MB');
  assert.equal(formatBytes(104857600), '100 MB');
});

test('DocumentStatusBadge: renders "Ready for Learning" for ready status', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DocumentStatusBadge, { status: 'ready' })
  );
  assert.match(html, /Ready for Learning/);
  assert.match(html, /doc-status-badge--ready/);
});

test('DocumentStatusBadge: renders "Partially Extracted" for ready_partial status', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DocumentStatusBadge, { status: 'ready_partial' })
  );
  assert.match(html, /Partially Extracted/);
  assert.match(html, /doc-status-badge--ready_partial/);
});

test('DocumentStatusBadge: renders "Extracting Content" with spinner for processing and uploaded', () => {
  const htmlProc = ReactDOMServer.renderToString(
    React.createElement(DocumentStatusBadge, { status: 'processing' })
  );
  assert.match(htmlProc, /Extracting Content/);
  assert.match(htmlProc, /status-spinner-icon/);

  const htmlUp = ReactDOMServer.renderToString(
    React.createElement(DocumentStatusBadge, { status: 'uploaded' })
  );
  assert.match(htmlUp, /Extracting Content/);
});

test('DocumentStatusBadge: renders "Extraction Failed" and "Password Required" appropriately', () => {
  const htmlFail = ReactDOMServer.renderToString(
    React.createElement(DocumentStatusBadge, { status: 'failed_retryable' })
  );
  assert.match(htmlFail, /Extraction Failed/);
  assert.match(htmlFail, /doc-status-badge--failed_retryable/);

  const htmlPass = ReactDOMServer.renderToString(
    React.createElement(DocumentStatusBadge, { status: 'password_required' })
  );
  assert.match(htmlPass, /Password Required/);
  assert.match(htmlPass, /doc-status-badge--password_required/);
});

test('DocumentUploadZone: renders drag-and-drop prompt, specs, and supported formats', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DocumentUploadZone, {
      onUpload: async () => {},
      busy: false,
    })
  );
  assert.match(html, /Drag &amp; drop learning material/);
  assert.match(html, /browse files/);
  assert.match(html, /100 MB/);
  assert.match(html, /\.pdf/);
  assert.match(html, /\.docx/);
  assert.match(html, /\.pptx/);
});

test('DocumentItemRow: renders document name, byte size, pages, and status badge', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DocumentItemRow, {
      document: sampleDocuments[0],
      onInspect: () => {},
      onDelete: () => {},
    })
  );
  assert.match(html, /Campbell_Biology_Ch12_CellCycle\.pdf/);
  assert.match(html, /14\.8 MB/);
  assert.match(html, /36.*pages ready/);
  assert.match(html, /Ready for Learning/);
  assert.match(html, /Inspect Text/);
  assert.match(html, /Delete document Campbell_Biology_Ch12_CellCycle\.pdf/);
});

test('DocumentItemRow: renders retry button and failure reason for failed documents', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DocumentItemRow, {
      document: sampleDocuments[2],
      onRetry: () => {},
      onDelete: () => {},
    })
  );
  assert.match(html, /Corrupted_Scan_Notes\.pdf/);
  assert.match(html, /Corrupted font encoding on page 3/);
  assert.match(html, /Retry Extraction/);
});

test('DocumentPreviewModal: renders header, provenance indicator, raw extracted text, and disclaimer', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DocumentPreviewModal, {
      isOpen: true,
      document: sampleDocuments[0],
      initialPageData: {
        document_id: 'doc-001',
        page_no: 1,
        status: 'ready',
        text: 'Chapter 12: The Cell Cycle.\nThe continuity of life is based on the reproduction of cells, or cell division.',
        provenance: {
          method: 'PDF Text Extraction Engine',
        },
      },
      onClose: () => {},
    })
  );
  assert.match(html, /Campbell_Biology_Ch12_CellCycle\.pdf/);
  assert.match(html, /Extracted source text is used for adaptive knowledge grounding/);
  assert.match(html, /PDF Text Extraction Engine/);
  assert.match(html, /Chapter 12: The Cell Cycle/);
  assert.match(html, /Page/);
});

test('DeleteDocumentModal: renders warning about knowledge chunks removal and confirm buttons', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(DeleteDocumentModal, {
      isOpen: true,
      document: sampleDocuments[0],
      onClose: () => {},
      onDelete: async () => {},
    })
  );
  assert.match(html, /Delete Course Material/);
  assert.match(html, /Campbell_Biology_Ch12_CellCycle\.pdf/);
  assert.match(html, /This will remove the file from storage and permanently delete all indexed knowledge chunks/);
  assert.match(html, /Delete Material/);
  assert.match(html, /Cancel/);
});

test('CourseMaterialLibrary: renders toolbar with search, status filters, and documents list', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(CourseMaterialLibrary, {
      courseId: 'c101',
      courseName: 'Advanced Cellular Biochemistry',
      documents: sampleDocuments,
      onUploadDocument: async () => {},
    })
  );
  assert.match(html, /Course Reference Materials/);
  assert.match(html, /All \(/);
  assert.match(html, /Ready \(/);
  assert.match(html, /Processing \(/);
  assert.match(html, /Needs Review \(/);
  assert.match(html, /Campbell_Biology_Ch12_CellCycle\.pdf/);
  assert.match(html, /Lecture_04_Mitosis_Handout\.docx/);
  assert.match(html, /Corrupted_Scan_Notes\.pdf/);
});

test('CourseMaterialLibrary: renders empty state when no documents exist', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(CourseMaterialLibrary, {
      courseId: 'c101',
      courseName: 'Advanced Cellular Biochemistry',
      documents: [],
      onUploadDocument: async () => {},
    })
  );
  assert.match(html, /No course materials uploaded yet/);
  assert.match(html, /Upload your syllabus, lecture slides, papers, or recordings/);
});

test('CourseDetailView: supports tabs switching between Topics and Reference Materials with count badge', () => {
  const sampleCourse = {
    course_id: 'c101',
    name: 'Advanced Cellular Biochemistry',
    subject_id: 'bio-401',
    description: 'Enzyme kinetics and cellular respiration.',
    course_kind: 'personal',
    membership: 'owner',
    owner_user_id: 'u1',
    updated_at: '2026-10-10T12:00:00Z',
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(CourseDetailView, {
      course: sampleCourse,
      concepts: [{ concept_id: 'top-1', name: 'Glycolysis', course_id: 'c101', order_index: 0 }],
      documents: sampleDocuments,
      onBack: () => {},
      onStartLearningCourse: () => {},
      onUploadMaterial: async () => {},
      onAddConcept: async () => {},
      isOwner: true,
    })
  );

  assert.match(html, /Curriculum &amp; Topics/);
  assert.match(html, /Reference Materials/);
  assert.match(html, />4<\/span>/); // count badge for 4 documents
});
